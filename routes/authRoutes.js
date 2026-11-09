const router = require("express").Router();
const { register, login, yo } = require("../controllers/authController");
const { verificarToken } = require("../middlewares/auth");
const { limiteLogin, limiteRegistro } = require("../middlewares/security");
const validar = require("../middlewares/validate");
const esquemas = require("../validators/auth");

router.post(
  "/register",
  limiteRegistro,
  validar({ body: esquemas.registro }),
  register,
);
router.post("/login", limiteLogin, validar({ body: esquemas.login }), login);
router.get("/yo", verificarToken, yo);

module.exports = router;
