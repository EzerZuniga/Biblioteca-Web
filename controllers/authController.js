const auth = require("../services/auth");
const cookieSesion = require("../utils/sessionCookie");
const { capturarErrores } = require("../utils/errors");

const register = async (req, res) => {
  const usuario = await auth.registrar(req.body);
  res.status(201).json({ mensaje: "Cuenta creada correctamente", usuario });
};

// El token va en la cookie httpOnly y no en la respuesta: el JavaScript del
// navegador nunca lo ve.
const login = async (req, res) => {
  const { token, usuario } = await auth.iniciarSesion(req.body);
  cookieSesion.guardar(req, res, token);
  res.json({ usuario });
};

const logout = (req, res) => {
  cookieSesion.borrar(req, res);
  res.json({ mensaje: "Sesión cerrada" });
};

const yo = (req, res) => {
  const { id, nombre, rol } = req.usuario;
  res.json({ id, nombre, rol });
};

module.exports = capturarErrores({ register, login, logout, yo });
