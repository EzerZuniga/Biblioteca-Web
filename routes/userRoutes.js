const router = require("express").Router();
const { verificarToken, soloAdmin } = require("../middlewares/auth");
const validar = require("../middlewares/validate");
const esquemas = require("../validators/users");
const { paramId } = require("../validators/common");
const {
  listar,
  actualizar,
  eliminar,
} = require("../controllers/userController");

router.use(verificarToken, soloAdmin);

router.get("/", listar);
router.put(
  "/:id",
  validar({ params: paramId, body: esquemas.actualizar }),
  actualizar,
);
router.delete("/:id", validar({ params: paramId }), eliminar);

module.exports = router;
