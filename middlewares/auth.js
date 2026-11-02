const jwt = require('jsonwebtoken');

// 1) Verifica que la petición traiga un token válido: Authorization: Bearer <token>
const verificarToken = (req, res, next) => {
  const cabecera = req.headers.authorization || '';
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;

  if (!token) {
    return res.status(401).json({ mensaje: 'Debes iniciar sesión' });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET); // { id, nombre, rol }
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Tu sesión expiró. Inicia sesión de nuevo' });
  }
};

// 2) Control de acceso por roles
const soloAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ mensaje: 'Solo un administrador puede hacer esto' });
  }
  next();
};

const soloUsuario = (req, res, next) => {
  if (req.usuario.rol !== 'usuario') {
    return res.status(403).json({ mensaje: 'Esta acción es solo para usuarios' });
  }
  next();
};

module.exports = { verificarToken, soloAdmin, soloUsuario };
