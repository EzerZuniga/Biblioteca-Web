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
  aprobar,
  devolver,
} = require("../controllers/loanController");

router.use(verificarToken);

router.post("/", soloUsuario, validar({ body: esquemas.crear }), crear);
router.get("/", listar); // admin: todos | usuario: los suyos
router.put("/:id/aprobar", soloAdmin, validar({ params: paramId }), aprobar);
router.put("/:id/devolver", soloAdmin, validar({ params: paramId }), devolver);

module.exports = router;
