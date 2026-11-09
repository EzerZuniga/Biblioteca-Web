const router = require("express").Router();
const {
  verificarToken,
  soloAdmin,
  soloUsuario,
} = require("../middlewares/auth");
const validar = require("../middlewares/validar");
const esquemas = require("../validaciones/prestamos");
const { paramId } = require("../validaciones/comunes");
const {
  crear,
  listar,
  aprobar,
  devolver,
} = require("../controllers/prestamoController");

router.use(verificarToken);

router.post("/", soloUsuario, validar({ body: esquemas.crear }), crear);
router.get("/", listar); // admin: todos | usuario: los suyos
router.put("/:id/aprobar", soloAdmin, validar({ params: paramId }), aprobar);
router.put("/:id/devolver", soloAdmin, validar({ params: paramId }), devolver);

module.exports = router;
