const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
  const cabecera = req.headers.authorization || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;

  if (!token) {
    return res.status(401).json({ mensaje: "Debes iniciar sesión" });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ mensaje: "Tu sesión expiró. Inicia sesión de nuevo" });
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
