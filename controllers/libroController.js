const { Op } = require("sequelize");
const { Libro, Prestamo } = require("../models");
const {
  ErrorNegocio,
  buscarOFallar,
  capturarErrores,
} = require("../utils/errores");
const {
  prestadosLiteral,
  contarPrestados,
  conDisponibles,
  transaccion,
} = require("../services/inventario");

// En LIKE, % y _ son comodines: se escapan para buscar el texto literal.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, "\\$&");

const listar = async (req, res) => {
  const where = {};
  if (req.query.titulo) {
    where.titulo = { [Op.like]: `%${escaparLike(req.query.titulo)}%` };
  }
  const libros = await Libro.findAll({
    where,
    attributes: { include: [prestadosLiteral()] },
    order: [["titulo", "ASC"]],
  });
  res.json(libros.map((libro) => conDisponibles(libro)));
};

const crear = async (req, res) => {
  const libro = await Libro.create(req.body);
  res
    .status(201)
    .json({ mensaje: "Libro creado", libro: conDisponibles(libro, 0) });
};

const actualizar = async (req, res) => {
  const libro = await transaccion(async (t) => {
    const libro = await buscarOFallar(
      Libro,
      req.params.id,
      "Libro no encontrado",
      { transaction: t, lock: t.LOCK.UPDATE },
    );
    const prestados = await contarPrestados(libro.id, t);
    if (req.body.cantidad !== undefined && req.body.cantidad < prestados) {
      throw new ErrorNegocio(
        409,
        `Hay ${prestados} ejemplares prestados. El total no puede ser menor que eso.`,
      );
    }

    libro.set(req.body);
    await libro.save({ transaction: t });
    return conDisponibles(libro, prestados);
  });

  res.json({ mensaje: "Libro actualizado", libro });
};

const eliminar = async (req, res) => {
  const libro = await buscarOFallar(
    Libro,
    req.params.id,
    "Libro no encontrado",
  );

  const prestamos = await Prestamo.count({ where: { libro_id: libro.id } });
  if (prestamos > 0) {
    throw new ErrorNegocio(
      409,
      "No se puede eliminar: el libro tiene préstamos registrados",
    );
  }

  await libro.destroy();
  res.json({ mensaje: "Libro eliminado" });
};

module.exports = capturarErrores({ listar, crear, actualizar, eliminar });
