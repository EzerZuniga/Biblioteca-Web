const router = require("express").Router();
const { register, login, yo } = require("../controllers/authController");
const { verificarToken } = require("../middlewares/auth");
const { limiteLogin, limiteRegistro } = require("../middlewares/seguridad");

router.post("/register", limiteRegistro, register);
router.post("/login", limiteLogin, login);
router.get("/yo", verificarToken, yo);

module.exports = router;
