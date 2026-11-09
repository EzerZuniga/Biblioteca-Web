const crypto = require("crypto");
const { Op } = require("sequelize");
const { Usuario, Libro, Prestamo } = require("../models");
const {
  ErrorNegocio,
  buscarOFallar,
  capturarErrores,
} = require("../utils/errores");
const { contarPrestados, transaccion } = require("../services/inventario");
const { fechaLocal } = require("../utils/fechas");

const generarCodigo = () => crypto.randomBytes(4).toString("hex").toUpperCase();

const codigoUnico = async (transaction) => {
  for (let i = 0; i < 5; i++) {
    const codigo = generarCodigo();
    const existe = await Prestamo.findOne({ where: { codigo }, transaction });
    if (!existe) return codigo;
  }
  throw new Error("No se pudo generar un código único");
};

const incluir = [
  { model: Libro, attributes: ["id", "titulo", "autor"] },
  { model: Usuario, attributes: ["id", "nombre", "email"] },
];

const bloquearPrestamo = (id, t) =>
  buscarOFallar(Prestamo, id, "Préstamo no encontrado", {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

const crear = async (req, res) => {
  const { libro_id } = req.body;

  const prestamo = await transaccion(async (t) => {
    // Bloquear la fila del usuario pone en fila sus solicitudes simultáneas
    // sin frenar las de otros usuarios.
    const usuario = await Usuario.findByPk(req.usuario.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!usuario) throw new ErrorNegocio(401, "Inicia sesión de nuevo");

    const libro = await buscarOFallar(Libro, libro_id, "El libro no existe", {
      transaction: t,
    });
    const prestados = await contarPrestados(libro.id, t);
    if (libro.cantidad - prestados < 1) {
      throw new ErrorNegocio(400, "No hay ejemplares disponibles de este libro");
    }

    const activo = await Prestamo.findOne({
      where: {
        usuario_id: usuario.id,
        libro_id,
        estado: { [Op.in]: ["pendiente", "prestado"] },
      },
      transaction: t,
    });
    if (activo) {
      throw new ErrorNegocio(
        409,
        "Ya tienes una solicitud o un préstamo activo de este libro",
      );
    }

    return Prestamo.create(
      {
        usuario_id: usuario.id,
        libro_id,
        codigo: await codigoUnico(t),
        estado: "pendiente",
      },
      { transaction: t },
    );
  });

  res.status(201).json({
    mensaje: `Solicitud enviada. Tu código es ${prestamo.codigo}`,
    prestamo,
  });
};

const listar = async (req, res) => {
  const where =
    req.usuario.rol === "admin" ? {} : { usuario_id: req.usuario.id };
  const prestamos = await Prestamo.findAll({
    where,
    include: incluir,
    order: [["id", "DESC"]],
  });
  res.json(prestamos);
};

const aprobar = async (req, res) => {
  const prestamo = await transaccion(async (t) => {
    const p = await bloquearPrestamo(req.params.id, t);
    if (p.estado !== "pendiente") {
      throw new ErrorNegocio(400, "Solo se pueden aprobar préstamos pendientes");
    }

    const libro = await buscarOFallar(Libro, p.libro_id, "El libro no existe", {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const prestados = await contarPrestados(libro.id, t);
    if (libro.cantidad - prestados < 1) {
      throw new ErrorNegocio(
        400,
        "No quedan ejemplares disponibles para aprobar",
      );
    }

    p.estado = "prestado";
    p.fecha_prestamo = fechaLocal();
    await p.save({ transaction: t });
    return p;
  });

  res.json({ mensaje: "Préstamo aprobado", prestamo });
};

const devolver = async (req, res) => {
  const prestamo = await transaccion(async (t) => {
    const p = await bloquearPrestamo(req.params.id, t);
    if (p.estado !== "prestado") {
      throw new ErrorNegocio(
        400,
        "Solo se pueden devolver préstamos que están prestados",
      );
    }

    p.estado = "devuelto";
    p.fecha_devolucion = fechaLocal();
    await p.save({ transaction: t });
    return p;
  });

  res.json({ mensaje: "Devolución registrada", prestamo });
};

module.exports = capturarErrores({ crear, listar, aprobar, devolver });
