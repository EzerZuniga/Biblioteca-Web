const { Op } = require("sequelize");
const { Libro, Prestamo } = require("../models");
const { enteroNoNegativo } = require("../utils/validar");
const { ErrorNegocio, responderError } = require("../utils/errores");
const {
  prestadosLiteral,
  contarPrestados,
  conDisponibles,
  transaccion,
} = require("../services/inventario");

exports.listar = async (req, res) => {
  try {
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
  } catch (error) {
    responderError(res, error);
  }
};

exports.crear = async (req, res) => {
  try {
    const { titulo, autor, categoria, cantidad } = req.body;

    if (!titulo || !String(titulo).trim() || !autor || !String(autor).trim()) {
      throw new ErrorNegocio(400, "El título y el autor son obligatorios");
    }
    if (!enteroNoNegativo(cantidad)) {
      throw new ErrorNegocio(
        400,
        "La cantidad de ejemplares debe ser un número entero de 0 o más",
      );
    }

    const libro = await Libro.create({
      titulo: String(titulo).trim(),
      autor: String(autor).trim(),
      categoria:
        categoria && String(categoria).trim()
          ? String(categoria).trim()
          : "General",
      cantidad: Number(cantidad),
    });
    res
      .status(201)
      .json({ mensaje: "Libro creado", libro: conDisponibles(libro, 0) });
  } catch (error) {
    responderError(res, error);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const libro = await transaccion(async (t) => {
      const libro = await Libro.findByPk(req.params.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!libro) throw new ErrorNegocio(404, "Libro no encontrado");

      const { titulo, autor, categoria, cantidad } = req.body;

      if (titulo !== undefined) {
        if (!String(titulo).trim())
          throw new ErrorNegocio(400, "El título no puede estar vacío");
        libro.titulo = String(titulo).trim();
      }
      if (autor !== undefined) {
        if (!String(autor).trim())
          throw new ErrorNegocio(400, "El autor no puede estar vacío");
        libro.autor = String(autor).trim();
      }
      if (categoria !== undefined) {
        libro.categoria = String(categoria).trim() || "General";
      }

      const prestados = await contarPrestados(libro.id, t);
      if (cantidad !== undefined) {
        if (!enteroNoNegativo(cantidad)) {
          throw new ErrorNegocio(
            400,
            "La cantidad de ejemplares debe ser un número entero de 0 o más",
          );
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
  } catch (error) {
    responderError(res, error);
  }
};

exports.eliminar = async (req, res) => {
  try {
    const libro = await Libro.findByPk(req.params.id);
    if (!libro) throw new ErrorNegocio(404, "Libro no encontrado");

    const prestamos = await Prestamo.count({ where: { libro_id: libro.id } });
    if (prestamos > 0) {
      throw new ErrorNegocio(
        409,
        "No se puede eliminar: el libro tiene préstamos registrados",
      );
    }

    await libro.destroy();
    res.json({ mensaje: "Libro eliminado" });
  } catch (error) {
    responderError(res, error);
  }
};
