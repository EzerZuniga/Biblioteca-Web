const router = require("express").Router();
const { verificarToken, soloAdmin } = require("../middlewares/auth");
const validar = require("../middlewares/validar");
const esquemas = require("../validaciones/libros");
const { paramId } = require("../validaciones/comunes");
const {
  listar,
  crear,
  actualizar,
  eliminar,
} = require("../controllers/libroController");

router.use(verificarToken);

router.get("/", validar({ query: esquemas.busqueda }), listar);
router.post("/", soloAdmin, validar({ body: esquemas.crear }), crear);
router.put(
  "/:id",
  soloAdmin,
  validar({ params: paramId, body: esquemas.actualizar }),
  actualizar,
);
router.delete("/:id", soloAdmin, validar({ params: paramId }), eliminar);

module.exports = router;
