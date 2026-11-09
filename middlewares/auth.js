const { sesionDesdeToken } = require("../services/auth");
const { SinPermiso } = require("../utils/errores");

const verificarToken = async (req, res, next) => {
  const cabecera = req.headers.authorization || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;
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

module.exports = { verificarToken, soloAdmin, soloUsuario };
