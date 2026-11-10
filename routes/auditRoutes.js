const router = require("express").Router();
const { verificarToken, soloAdmin } = require("../middlewares/auth");
const validar = require("../middlewares/validate");
const esquemas = require("../validators/audit");
const { listar } = require("../controllers/auditController");

router.use(verificarToken, soloAdmin);

router.get("/", validar({ query: esquemas.listado }), listar);

module.exports = router;
