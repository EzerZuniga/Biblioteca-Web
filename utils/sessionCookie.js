const { DURACION_SESION_SEGUNDOS } = require("../config/session");

// El token de sesión viaja en una cookie que JavaScript no puede leer
// (httpOnly): si alguna vez se cuela un script en la página, no puede robarlo.
// SameSite=Strict impide que el navegador la envíe desde otros sitios, y
// Secure (en HTTPS) que viaje sin cifrar.
const NOMBRE = "sesion";

const opciones = (req) => ({
  httpOnly: true,
  secure: req.secure,
  sameSite: "strict",
  path: "/",
});

const guardar = (req, res, token) => {
  res.cookie(NOMBRE, token, {
    ...opciones(req),
    maxAge: DURACION_SESION_SEGUNDOS * 1000,
  });
};

const borrar = (req, res) => {
  res.clearCookie(NOMBRE, opciones(req));
};

const leer = (req) => {
  for (const parte of (req.headers.cookie ?? "").split(";")) {
    const separador = parte.indexOf("=");
    if (parte.slice(0, separador).trim() !== NOMBRE) continue;
    try {
      return decodeURIComponent(parte.slice(separador + 1).trim()) || null;
    } catch {
      return null;
    }
  }
  return null;
};

module.exports = { NOMBRE, guardar, borrar, leer };
