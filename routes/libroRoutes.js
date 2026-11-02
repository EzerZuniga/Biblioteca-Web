const router = require('express').Router();
const { verificarToken, soloAdmin } = require('../middlewares/auth');
const { listar, crear, actualizar, eliminar } = require('../controllers/libroController');

router.get('/', verificarToken, listar); // cualquier usuario con sesión
router.post('/', verificarToken, soloAdmin, crear);
router.put('/:id', verificarToken, soloAdmin, actualizar);
router.delete('/:id', verificarToken, soloAdmin, eliminar);

module.exports = router;
