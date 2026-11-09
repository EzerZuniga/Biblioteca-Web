const crypto = require("crypto");
const { Op } = require("sequelize");
const { Usuario, Libro, Prestamo } = require("../models");
const {
  SolicitudInvalida,
  NoAutenticado,
  NoEncontrado,
  Conflicto,
  buscarOFallar,
} = require("../utils/errors");
const { contarPrestados, transaccion } = require("./inventory");
const { paginar } = require("./pagination");
const { fechaLocal, sumarDias, diasEntre } = require("../utils/dates");
const { DIAS_PRESTAMO, MAX_PRESTAMOS_ACTIVOS } = require("../config/loans");

const ESTADOS_ACTIVOS = ["pendiente", "prestado"];

// Un préstamo vence si sigue prestado después de su fecha límite.
const condicionVencidos = (hoy) => ({
  estado: "prestado",
  fecha_limite: { [Op.lt]: hoy },
});

const conVencimiento = (prestamo, hoy = fechaLocal()) => {
  const datos = prestamo.toJSON();
  const vencido =
    datos.estado === "prestado" &&
    datos.fecha_limite != null &&
    datos.fecha_limite < hoy;
  return {
    ...datos,
    vencido,
    diasDeRetraso: vencido ? diasEntre(datos.fecha_limite, hoy) : 0,
  };
};

const generarCodigo = () => crypto.randomBytes(4).toString("hex").toUpperCase();

const codigoUnico = async (transaction) => {
  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigo();
    const existe = await Prestamo.findOne({ where: { codigo }, transaction });
    if (!existe) return codigo;
  }
  throw new Error("No se pudo generar un código de préstamo único");
};

const exigirDisponible = async (libro, transaction, mensaje) => {
  const prestados = await contarPrestados(libro.id, transaction);
  if (libro.cantidad - prestados < 1) throw new SolicitudInvalida(mensaje);
};

const bloquearPrestamo = (id, t) =>
  buscarOFallar(Prestamo, id, "Préstamo no encontrado", {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

// Reglas para pedir un libro: sin préstamos vencidos, sin pasar el máximo de
// préstamos activos y sin repetir un libro que ya se tiene o se pidió.
const exigirQuePuedaPedir = async (usuarioId, libroId, t) => {
  const vencidos = await Prestamo.count({
    where: { usuario_id: usuarioId, ...condicionVencidos(fechaLocal()) },
    transaction: t,
  });
  if (vencidos > 0) {
    throw new Conflicto(
      "Tienes préstamos vencidos. Devuélvelos para poder pedir otro libro.",
    );
  }

  const activos = await Prestamo.findAll({
    where: { usuario_id: usuarioId, estado: { [Op.in]: ESTADOS_ACTIVOS } },
    attributes: ["libro_id"],
    transaction: t,
  });
  if (activos.some((p) => p.libro_id === libroId)) {
    throw new Conflicto(
      "Ya tienes una solicitud o un préstamo activo de este libro",
    );
  }
  if (activos.length >= MAX_PRESTAMOS_ACTIVOS) {
    throw new Conflicto(
      `Puedes tener como máximo ${MAX_PRESTAMOS_ACTIVOS} préstamos o solicitudes activas`,
    );
  }
};

const solicitar = (usuarioId, libroId) =>
  transaccion(async (t) => {
    // Bloquear la fila del usuario pone en fila sus solicitudes simultáneas
    // sin frenar las de otros usuarios.
    const usuario = await Usuario.findByPk(usuarioId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!usuario) throw new NoAutenticado("Inicia sesión de nuevo");

    const libro = await buscarOFallar(Libro, libroId, "El libro no existe", {
      transaction: t,
    });
    await exigirDisponible(
      libro,
      t,
      "No hay ejemplares disponibles de este libro",
    );
    await exigirQuePuedaPedir(usuario.id, libro.id, t);

    const prestamo = await Prestamo.create(
      {
        usuario_id: usuario.id,
        libro_id: libro.id,
        codigo: await codigoUnico(t),
        estado: "pendiente",
      },
      { transaction: t },
    );
    return conVencimiento(prestamo);
  });

// El admin ve todos los préstamos; un lector, solo los suyos.
const listarPara = async (usuario, { estado, ...pagina } = {}) => {
  const hoy = fechaLocal();
  const filtroEstado =
    estado === "vencido" ? condicionVencidos(hoy) : estado && { estado };

  const resultado = await paginar(
    Prestamo,
    {
      where: {
        ...(usuario.rol !== "admin" && { usuario_id: usuario.id }),
        ...filtroEstado,
      },
      include: [
        { model: Libro, attributes: ["id", "titulo", "autor"] },
        { model: Usuario, attributes: ["id", "nombre", "email"] },
      ],
      order: [["id", "DESC"]],
    },
    pagina,
  );
  return {
    ...resultado,
    datos: resultado.datos.map((prestamo) => conVencimiento(prestamo, hoy)),
  };
};

// Cifras para el panel del administrador.
const resumen = async () => {
  const [pendientes, prestados, vencidos] = await Promise.all([
    Prestamo.count({ where: { estado: "pendiente" } }),
    Prestamo.count({ where: { estado: "prestado" } }),
    Prestamo.count({ where: condicionVencidos(fechaLocal()) }),
  ]);
  return { pendientes, prestados, vencidos };
};

const exigirPendiente = (prestamo, accion) => {
  if (prestamo.estado !== "pendiente") {
    throw new SolicitudInvalida(
      `Solo se pueden ${accion} solicitudes pendientes`,
    );
  }
};

const aprobar = (id) =>
  transaccion(async (t) => {
    const prestamo = await bloquearPrestamo(id, t);
    exigirPendiente(prestamo, "aprobar");

    const libro = await buscarOFallar(
      Libro,
      prestamo.libro_id,
      "El libro no existe",
      { transaction: t, lock: t.LOCK.UPDATE },
    );
    await exigirDisponible(
      libro,
      t,
      "No quedan ejemplares disponibles para aprobar",
    );

    const hoy = fechaLocal();
    prestamo.estado = "prestado";
    prestamo.fecha_prestamo = hoy;
    prestamo.fecha_limite = sumarDias(hoy, DIAS_PRESTAMO);
    await prestamo.save({ transaction: t });
    return conVencimiento(prestamo, hoy);
  });

const rechazar = (id, { motivo } = {}) =>
  transaccion(async (t) => {
    const prestamo = await bloquearPrestamo(id, t);
    exigirPendiente(prestamo, "rechazar");

    prestamo.estado = "rechazado";
    prestamo.motivo_rechazo = motivo ?? null;
    await prestamo.save({ transaction: t });
    return conVencimiento(prestamo);
  });

// Un lector solo cancela sus propias solicitudes. Si la solicitud es de otro,
// se responde como si no existiera para no revelar préstamos ajenos.
const cancelar = (id, usuarioId) =>
  transaccion(async (t) => {
    const prestamo = await bloquearPrestamo(id, t);
    if (prestamo.usuario_id !== usuarioId) {
      throw new NoEncontrado("Préstamo no encontrado");
    }
    exigirPendiente(prestamo, "cancelar");

    prestamo.estado = "cancelado";
    await prestamo.save({ transaction: t });
    return conVencimiento(prestamo);
  });

const devolver = (id) =>
  transaccion(async (t) => {
    const prestamo = await bloquearPrestamo(id, t);
    if (prestamo.estado !== "prestado") {
      throw new SolicitudInvalida(
        "Solo se pueden devolver préstamos que están prestados",
      );
    }

    prestamo.estado = "devuelto";
    prestamo.fecha_devolucion = fechaLocal();
    await prestamo.save({ transaction: t });
    return conVencimiento(prestamo);
  });

module.exports = {
  solicitar,
  listarPara,
  resumen,
  aprobar,
  rechazar,
  cancelar,
  devolver,
};
