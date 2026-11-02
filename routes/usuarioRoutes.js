const router = require("express").Router();
const { verificarToken, soloAdmin } = require("../middlewares/auth");
const {
  listar,
  actualizar,
  eliminar,
} = require("../controllers/usuarioController");

router.use(verificarToken, soloAdmin);

router.get("/", listar);
router.put("/:id", actualizar);
router.delete("/:id", eliminar);

module.exports = router;
