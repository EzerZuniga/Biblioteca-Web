const { Op } = require("sequelize");
const { Libro, Prestamo } = require("../models");
const { enteroNoNegativo } = require("../utils/validar");
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

const MENSAJE_CANTIDAD =
  "La cantidad de ejemplares debe ser un número entero de 0 o más";

const listar = async (req, res) => {
  const where = {};
  if (req.query.titulo) {
    where.titulo = { [Op.like]: `%${req.query.titulo}%` };
  }
  const libros = await Libro.findAll({
    where,
    attributes: { include: [prestadosLiteral()] },
    order: [["titulo", "ASC"]],
  });
  res.json(libros.map((libro) => conDisponibles(libro)));
};

const crear = async (req, res) => {
  const { titulo, autor, categoria, cantidad } = req.body;

  if (!titulo || !String(titulo).trim() || !autor || !String(autor).trim()) {
    throw new ErrorNegocio(400, "El título y el autor son obligatorios");
  }
  if (!enteroNoNegativo(cantidad)) {
    throw new ErrorNegocio(400, MENSAJE_CANTIDAD);
  }

  const libro = await Libro.create({
    titulo: String(titulo).trim(),
    autor: String(autor).trim(),
    categoria: String(categoria ?? "").trim() || "General",
    cantidad: Number(cantidad),
  });
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
    const { titulo, autor, categoria, cantidad } = req.body;

    if (titulo !== undefined) {
      if (!String(titulo).trim()) {
        throw new ErrorNegocio(400, "El título no puede estar vacío");
      }
      libro.titulo = String(titulo).trim();
    }
    if (autor !== undefined) {
      if (!String(autor).trim()) {
        throw new ErrorNegocio(400, "El autor no puede estar vacío");
      }
      libro.autor = String(autor).trim();
    }
    if (categoria !== undefined) {
      libro.categoria = String(categoria).trim() || "General";
    }

    const prestados = await contarPrestados(libro.id, t);
    if (cantidad !== undefined) {
      if (!enteroNoNegativo(cantidad)) {
        throw new ErrorNegocio(400, MENSAJE_CANTIDAD);
      }
      if (Number(cantidad) < prestados) {
        throw new ErrorNegocio(
          409,
          `Hay ${prestados} ejemplares prestados. El total no puede ser menor que eso.`,
        );
      }
      libro.cantidad = Number(cantidad);
    }

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
