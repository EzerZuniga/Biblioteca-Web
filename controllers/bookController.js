const libros = require("../services/books");
const { capturarErrores } = require("../utils/errors");

const actor = (req) => ({ actorId: req.usuario.id });

const listar = async (req, res) => {
  res.json(await libros.listar(req.query));
};

const crear = async (req, res) => {
  const libro = await libros.crear(req.body, actor(req));
  res.status(201).json({ mensaje: "Libro creado", libro });
};

const actualizar = async (req, res) => {
  const libro = await libros.actualizar(req.params.id, req.body, actor(req));
  res.json({ mensaje: "Libro actualizado", libro });
};

const eliminar = async (req, res) => {
  await libros.eliminar(req.params.id, actor(req));
  res.json({ mensaje: "Libro eliminado" });
};

module.exports = capturarErrores({ listar, crear, actualizar, eliminar });
