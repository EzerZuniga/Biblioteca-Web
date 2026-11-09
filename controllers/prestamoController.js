const crypto = require("crypto");
const { Op } = require("sequelize");
const { Usuario, Libro, Prestamo } = require("../models");
const { ErrorNegocio, responderError } = require("../utils/errores");
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

exports.crear = async (req, res) => {
  try {
    const libro_id = Number(req.body.libro_id);
    if (!Number.isInteger(libro_id) || libro_id < 1) {
      throw new ErrorNegocio(400, "Indica un libro válido");
    }

    const prestamo = await transaccion(async (t) => {
      // Bloquear la fila del usuario pone en fila sus solicitudes: si llegan
      // dos a la vez, la segunda espera y luego ve la que creó la primera.
      // Las solicitudes de otros usuarios no se bloquean entre sí.
      const usuario = await Usuario.findByPk(req.usuario.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!usuario) throw new ErrorNegocio(401, "Inicia sesión de nuevo");

      const libro = await Libro.findByPk(libro_id, { transaction: t });
      if (!libro) throw new ErrorNegocio(404, "El libro no existe");
      const prestados = await contarPrestados(libro.id, t);
      if (libro.cantidad - prestados < 1)
        throw new ErrorNegocio(
          400,
          "No hay ejemplares disponibles de este libro",
        );

      const activo = await Prestamo.findOne({
        where: {
          usuario_id: usuario.id,
          libro_id,
          estado: { [Op.in]: ["pendiente", "prestado"] },
        },
        transaction: t,
      });
      if (activo)
        throw new ErrorNegocio(
          409,
          "Ya tienes una solicitud o un préstamo activo de este libro",
        );

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
  } catch (error) {
    responderError(res, error);
  }
};

exports.listar = async (req, res) => {
  try {
    const where =
      req.usuario.rol === "admin" ? {} : { usuario_id: req.usuario.id };
    const prestamos = await Prestamo.findAll({
      where,
      include: incluir,
      order: [["id", "DESC"]],
    });
    res.json(prestamos);
  } catch (error) {
    responderError(res, error);
  }
};

exports.aprobar = async (req, res) => {
  try {
    const prestamo = await transaccion(async (t) => {
      const p = await Prestamo.findByPk(req.params.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!p) throw new ErrorNegocio(404, "Préstamo no encontrado");
      if (p.estado !== "pendiente")
        throw new ErrorNegocio(
          400,
          "Solo se pueden aprobar préstamos pendientes",
        );

      const libro = await Libro.findByPk(p.libro_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const prestados = libro ? await contarPrestados(libro.id, t) : 0;
      if (!libro || libro.cantidad - prestados < 1)
        throw new ErrorNegocio(
          400,
          "No quedan ejemplares disponibles para aprobar",
        );

      p.estado = "prestado";
      p.fecha_prestamo = fechaLocal();
      await p.save({ transaction: t });
      return p;
    });

    res.json({ mensaje: "Préstamo aprobado", prestamo });
  } catch (error) {
    responderError(res, error);
  }
};

exports.devolver = async (req, res) => {
  try {
    const prestamo = await transaccion(async (t) => {
      const p = await Prestamo.findByPk(req.params.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!p) throw new ErrorNegocio(404, "Préstamo no encontrado");
      if (p.estado !== "prestado")
        throw new ErrorNegocio(
          400,
          "Solo se pueden devolver préstamos que están prestados",
        );

      p.estado = "devuelto";
      p.fecha_devolucion = fechaLocal();
      await p.save({ transaction: t });
      return p;
    });

    res.json({ mensaje: "Devolución registrada", prestamo });
  } catch (error) {
    responderError(res, error);
  }
};
