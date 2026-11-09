const router = require("express").Router();
const { register, login, yo } = require("../controllers/authController");
const { verificarToken } = require("../middlewares/auth");
const { limiteLogin, limiteRegistro } = require("../middlewares/seguridad");
const validar = require("../middlewares/validar");
const esquemas = require("../validaciones/auth");

router.post(
  "/register",
  limiteRegistro,
  validar({ body: esquemas.registro }),
  register,
);
router.post("/login", limiteLogin, validar({ body: esquemas.login }), login);
router.get("/yo", verificarToken, yo);

module.exports = router;
