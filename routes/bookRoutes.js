const router = require("express").Router();
const { verificarToken, soloAdmin } = require("../middlewares/auth");
const validar = require("../middlewares/validate");
const esquemas = require("../validators/books");
const { paramId } = require("../validators/common");
const {
  listar,
  crear,
  actualizar,
  eliminar,
} = require("../controllers/bookController");

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
