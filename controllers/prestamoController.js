const crypto = require("crypto");
const { Op } = require("sequelize");
const { sequelize, Usuario, Libro, Prestamo } = require("../models");

class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const responderError = (res, error) => {
  if (error instanceof ErrorNegocio) {
    return res.status(error.status).json({ mensaje: error.message });
  }
  console.error(error);
  return res.status(500).json({ mensaje: "Error del servidor" });
};

const hoy = () => {
  const d = new Date();
  const dos = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
};

const generarCodigo = () => crypto.randomBytes(4).toString("hex").toUpperCase();

const codigoUnico = async () => {
  for (let i = 0; i < 5; i++) {
    const codigo = generarCodigo();
    const existe = await Prestamo.findOne({ where: { codigo } });
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

    const libro = await Libro.findByPk(libro_id);
    if (!libro) throw new ErrorNegocio(404, "El libro no existe");
    if (libro.cantidad < 1)
      throw new ErrorNegocio(
        400,
        "No hay ejemplares disponibles de este libro",
      );

    const activo = await Prestamo.findOne({
      where: {
        usuario_id: req.usuario.id,
        libro_id,
        estado: { [Op.in]: ["pendiente", "prestado"] },
      },
    });
    if (activo)
      throw new ErrorNegocio(
        409,
        "Ya tienes una solicitud o un préstamo activo de este libro",
      );

    const codigo = await codigoUnico();
    const prestamo = await Prestamo.create({
      usuario_id: req.usuario.id,
      libro_id,
      codigo,
      estado: "pendiente",
    });

    res
      .status(201)
      .json({ mensaje: `Solicitud enviada. Tu código es ${codigo}`, prestamo });
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
    const prestamo = await sequelize.transaction(async (t) => {
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
      if (!libro || libro.cantidad < 1)
        throw new ErrorNegocio(
          400,
          "No quedan ejemplares disponibles para aprobar",
        );

      libro.cantidad -= 1;
      await libro.save({ transaction: t });

      p.estado = "prestado";
      p.fecha_prestamo = hoy();
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
    const prestamo = await sequelize.transaction(async (t) => {
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

      const libro = await Libro.findByPk(p.libro_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (libro) {
        libro.cantidad += 1;
        await libro.save({ transaction: t });
      }

      p.estado = "devuelto";
      p.fecha_devolucion = hoy();
      await p.save({ transaction: t });
      return p;
    });

    res.json({ mensaje: "Devolución registrada", prestamo });
  } catch (error) {
    responderError(res, error);
  }
};
