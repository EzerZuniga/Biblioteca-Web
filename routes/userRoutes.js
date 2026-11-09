const router = require("express").Router();
const { verificarToken, soloAdmin } = require("../middlewares/auth");
const validar = require("../middlewares/validar");
const esquemas = require("../validaciones/usuarios");
const { paramId } = require("../validaciones/comunes");
const {
  listar,
  actualizar,
  eliminar,
} = require("../controllers/usuarioController");

router.use(verificarToken, soloAdmin);

router.get("/", listar);
router.put(
  "/:id",
  validar({ params: paramId, body: esquemas.actualizar }),
  actualizar,
);
router.delete("/:id", validar({ params: paramId }), eliminar);

module.exports = router;
