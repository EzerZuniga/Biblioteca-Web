const router = require("express").Router();

// Las páginas se renombraron a inglés. Las direcciones anteriores redirigen
// de forma permanente, así no se rompen enlaces ni marcadores guardados.
const PAGINAS_RENOMBRADAS = {
  "/catalogo.html": "/catalog.html",
  "/registro.html": "/register.html",
  "/mis-prestamos.html": "/my-loans.html",
  "/admin-libros.html": "/admin-books.html",
  "/admin-prestamos.html": "/admin-loans.html",
  "/admin-usuarios.html": "/admin-users.html",
};

router.get(Object.keys(PAGINAS_RENOMBRADAS), (req, res) => {
  const consulta = req.originalUrl.slice(req.path.length);
  res.redirect(301, PAGINAS_RENOMBRADAS[req.path] + consulta);
});

module.exports = { router, PAGINAS_RENOMBRADAS };
