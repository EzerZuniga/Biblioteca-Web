const auth = require("../services/auth");
const { capturarErrores } = require("../utils/errores");

const register = async (req, res) => {
  const usuario = await auth.registrar(req.body);
  res.status(201).json({ mensaje: "Cuenta creada correctamente", usuario });
};

const login = async (req, res) => {
  res.json(await auth.iniciarSesion(req.body));
};

const yo = (req, res) => {
  const { id, nombre, rol } = req.usuario;
  res.json({ id, nombre, rol });
};

module.exports = capturarErrores({ register, login, yo });
