const { sesionDesdeToken } = require("../services/auth");
const cookieSesion = require("../utils/sessionCookie");
const { SinPermiso } = require("../utils/errors");

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

// El navegador envía la cookie de sesión solo. Para que otro sitio no pueda
// provocar cambios a nombre del usuario (CSRF), las peticiones que modifican
// datos deben traer esta cabecera, que solo agrega nuestro frontend: sin CORS,
// otro sitio no puede ponerla.
const CABECERA_FRONTEND = "fetch";

// Acepta la sesión del navegador (cookie) o un token Bearer, para clientes
// que no son un navegador.
const verificarToken = async (req, res, next) => {
  const cabecera = req.headers.authorization || "";
  const bearer = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;
  const token = bearer ?? cookieSesion.leer(req);

  if (
    !bearer &&
    token &&
    !METODOS_SEGUROS.has(req.method) &&
    req.get("X-Requested-With") !== CABECERA_FRONTEND
  ) {
    return next(new SinPermiso("Petición no permitida"));
  }

  try {
    req.usuario = await sesionDesdeToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

const exigirRol = (rol, mensaje) => (req, res, next) => {
  next(req.usuario.rol === rol ? undefined : new SinPermiso(mensaje));
};

const soloAdmin = exigirRol("admin", "Solo un administrador puede hacer esto");
const soloUsuario = exigirRol("usuario", "Esta acción es solo para usuarios");

module.exports = {
  verificarToken,
  soloAdmin,
  soloUsuario,
  CABECERA_FRONTEND,
};
