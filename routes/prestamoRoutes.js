const { verificarToken, soloAdmin, soloUsuario } = require('../middlewares/auth');
const { crear, listar, aprobar, devolver } = require('../controllers/prestamoController');

router.post('/', verificarToken, soloUsuario, crear);
router.get('/', verificarToken, listar); // admin: todos | usuario: los suyos
router.put('/:id/aprobar', verificarToken, soloAdmin, aprobar);
router.put('/:id/devolver', verificarToken, soloAdmin, devolver);

module.exports = router;
