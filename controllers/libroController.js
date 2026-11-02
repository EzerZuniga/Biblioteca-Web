const { Op } = require("sequelize");
const { Libro, Prestamo } = require("../models");
const { enteroNoNegativo } = require("../utils/validar");

exports.listar = async (req, res) => {
  try {
    const where = {};
    if (req.query.titulo) {
      where.titulo = { [Op.like]: `%${req.query.titulo}%` };
    }
    const libros = await Libro.findAll({ where, order: [["titulo", "ASC"]] });
    res.json(libros);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

exports.crear = async (req, res) => {
  try {
    const { titulo, autor, categoria, cantidad } = req.body;

    if (!titulo || !String(titulo).trim() || !autor || !String(autor).trim()) {
      return res
        .status(400)
        .json({ mensaje: "El título y el autor son obligatorios" });
    }
    if (!enteroNoNegativo(cantidad)) {
      return res
        .status(400)
        .json({ mensaje: "La cantidad debe ser un número entero de 0 o más" });
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
    res.status(201).json({ mensaje: "Libro creado", libro });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const libro = await Libro.findByPk(req.params.id);
    if (!libro) return res.status(404).json({ mensaje: "Libro no encontrado" });

    const { titulo, autor, categoria, cantidad } = req.body;

    if (titulo !== undefined) {
      if (!String(titulo).trim())
        return res
          .status(400)
          .json({ mensaje: "El título no puede estar vacío" });
      libro.titulo = String(titulo).trim();
    }
    if (autor !== undefined) {
      if (!String(autor).trim())
        return res
          .status(400)
          .json({ mensaje: "El autor no puede estar vacío" });
      libro.autor = String(autor).trim();
    }
    if (categoria !== undefined) {
      libro.categoria = String(categoria).trim() || "General";
    }
    if (cantidad !== undefined) {
      if (!enteroNoNegativo(cantidad)) {
        return res
          .status(400)
          .json({
            mensaje: "La cantidad debe ser un número entero de 0 o más",
          });
      }
      libro.cantidad = Number(cantidad);
    }

    await libro.save();
    res.json({ mensaje: "Libro actualizado", libro });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const libro = await Libro.findByPk(req.params.id);
    if (!libro) return res.status(404).json({ mensaje: "Libro no encontrado" });

    const prestamos = await Prestamo.count({ where: { libro_id: libro.id } });
    if (prestamos > 0) {
      return res
        .status(409)
        .json({
          mensaje: "No se puede eliminar: el libro tiene préstamos registrados",
        });
    }

    await libro.destroy();
    res.json({ mensaje: "Libro eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};
