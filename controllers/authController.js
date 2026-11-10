const auth = require("../services/auth");
const recuperacion = require("../services/passwordReset");
const cookieSesion = require("../utils/sessionCookie");
const { urlPublica, esProduccion } = require("../config/mail");
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

// En desarrollo, sin URL_PUBLICA, el enlace usa la dirección de la petición.
// En producción solo la configurada (ver config/mail.js).
const urlBaseDeEnlaces = (req) =>
  urlPublica() ??
  (esProduccion() ? null : `${req.protocol}://${req.get("host")}`);

const recuperar = async (req, res) => {
  await recuperacion.solicitar(req.body.email, {
    urlBase: urlBaseDeEnlaces(req),
  });
  res.json({
    mensaje:
      "Si ese email está registrado, te enviamos un enlace para elegir una contraseña nueva. Revisa tu bandeja de entrada y la de spam.",
  });
};

const restablecer = async (req, res) => {
  await recuperacion.restablecer(req.body.token, req.body.password);
  // Por si quien restablece tenía una sesión abierta en este navegador.
  cookieSesion.borrar(req, res);
  res.json({ mensaje: "Contraseña actualizada. Ya puedes iniciar sesión." });
};

module.exports = capturarErrores({
  register,
  login,
  logout,
  yo,
  recuperar,
  restablecer,
});
