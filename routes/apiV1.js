const router = require("express").Router();
const { limiteApi } = require("../middlewares/security");

// Versión 1 de la API. Un cambio que rompa clientes (por ejemplo, la forma
// de una respuesta) va en una versión nueva, no aquí.
router.use(limiteApi);
router.use("/auth", require("./authRoutes"));
router.use("/usuarios", require("./userRoutes"));
router.use("/libros", require("./bookRoutes"));
router.use("/prestamos", require("./loanRoutes"));

module.exports = router;
