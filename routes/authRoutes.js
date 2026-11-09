const router = require("express").Router();
const { register, login, yo } = require("../controllers/authController");
const { verificarToken } = require("../middlewares/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/yo", verificarToken, yo);

module.exports = router;
