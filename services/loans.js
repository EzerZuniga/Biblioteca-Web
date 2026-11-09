const crypto = require("crypto");
const { Op } = require("sequelize");
const { Usuario, Libro, Prestamo } = require("../models");
const {
  SolicitudInvalida,
  NoAutenticado,
  Conflicto,
  buscarOFallar,
} = require("../utils/errors");
const { contarPrestados, transaccion } = require("./inventory");
const { fechaLocal } = require("../utils/dates");

const ESTADOS_ACTIVOS = ["pendiente", "prestado"];

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

    const activo = await Prestamo.findOne({
      where: {
        usuario_id: usuario.id,
        libro_id: libro.id,
        estado: { [Op.in]: ESTADOS_ACTIVOS },
      },
      transaction: t,
    });
    if (activo) {
      throw new Conflicto(
        "Ya tienes una solicitud o un préstamo activo de este libro",
      );
    }

    return Prestamo.create(
      {
        usuario_id: usuario.id,
        libro_id: libro.id,
        codigo: await codigoUnico(t),
        estado: "pendiente",
      },
      { transaction: t },
    );
  });

const listarPara = (usuario) =>
  Prestamo.findAll({
    where: usuario.rol === "admin" ? {} : { usuario_id: usuario.id },
    include: [
      { model: Libro, attributes: ["id", "titulo", "autor"] },
      { model: Usuario, attributes: ["id", "nombre", "email"] },
    ],
    order: [["id", "DESC"]],
  });

const aprobar = (id) =>
  transaccion(async (t) => {
    const prestamo = await bloquearPrestamo(id, t);
    if (prestamo.estado !== "pendiente") {
      throw new SolicitudInvalida(
        "Solo se pueden aprobar préstamos pendientes",
      );
    }

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

    prestamo.estado = "prestado";
    prestamo.fecha_prestamo = fechaLocal();
    await prestamo.save({ transaction: t });
    return prestamo;
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
    return prestamo;
  });

module.exports = { solicitar, listarPara, aprobar, devolver };
