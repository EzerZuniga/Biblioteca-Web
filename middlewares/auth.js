const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");

// El token solo prueba quién es el usuario. El rol y la validez de la sesión
// se leen de la base en cada petición, así un cambio de rol, un borrado o un
// cambio de contraseña se aplican de inmediato y no cuando expire el token.
const verificarToken = async (req, res, next) => {
  const cabecera = req.headers.authorization || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;

  if (!token) {
    return res.status(401).json({ mensaje: "Debes iniciar sesión" });
  }

  let datos;
  try {
    datos = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res
      .status(401)
      .json({ mensaje: "Tu sesión expiró. Inicia sesión de nuevo" });
  }

  try {
    const usuario = await Usuario.findByPk(datos.id, {
      attributes: ["id", "nombre", "email", "rol", "version_token"],
    });
    if (!usuario || (datos.v ?? 0) !== usuario.version_token) {
      return res
        .status(401)
        .json({ mensaje: "Tu sesión ya no es válida. Inicia sesión de nuevo" });
    }
    req.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };
    next();
  } catch (error) {
    next(error);
  }
};

const soloAdmin = (req, res, next) => {
  if (req.usuario.rol !== "admin") {
    return res
      .status(403)
      .json({ mensaje: "Solo un administrador puede hacer esto" });
  }
  next();
};

const soloUsuario = (req, res, next) => {
  if (req.usuario.rol !== "usuario") {
    return res
      .status(403)
      .json({ mensaje: "Esta acción es solo para usuarios" });
  }
  next();
};

module.exports = { verificarToken, soloAdmin, soloUsuario };
