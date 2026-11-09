const router = require("express").Router();
const {
  verificarToken,
  soloAdmin,
  soloUsuario,
} = require("../middlewares/auth");
const validar = require("../middlewares/validate");
const esquemas = require("../validators/loans");
const { paramId } = require("../validators/common");
const {
  crear,
  listar,
  resumen,
  aprobar,
  rechazar,
  cancelar,
  devolver,
} = require("../controllers/loanController");

router.use(verificarToken);

router.post("/", soloUsuario, validar({ body: esquemas.crear }), crear);
router.get("/", validar({ query: esquemas.listado }), listar); // admin: todos | usuario: los suyos
router.get("/resumen", soloAdmin, resumen);
router.put("/:id/aprobar", soloAdmin, validar({ params: paramId }), aprobar);
router.put(
  "/:id/rechazar",
  soloAdmin,
  validar({ params: paramId, body: esquemas.rechazo }),
  rechazar,
);
router.put(
  "/:id/cancelar",
  soloUsuario,
  validar({ params: paramId }),
  cancelar,
);
router.put("/:id/devolver", soloAdmin, validar({ params: paramId }), devolver);

module.exports = router;
