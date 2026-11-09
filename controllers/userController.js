const usuarios = require("../services/users");
const { capturarErrores } = require("../utils/errors");

const listar = async (req, res) => {
  res.json(await usuarios.listar(req.query));
};

const actualizar = async (req, res) => {
  const usuario = await usuarios.actualizar(req.params.id, req.body, {
    actorId: req.usuario.id,
  });
  res.json({ mensaje: "Usuario actualizado", usuario });
};

const eliminar = async (req, res) => {
  await usuarios.eliminar(req.params.id, { actorId: req.usuario.id });
  res.json({ mensaje: "Usuario eliminado" });
};

module.exports = capturarErrores({ listar, actualizar, eliminar });
