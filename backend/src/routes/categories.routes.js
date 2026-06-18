const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/categories.controller');

// All category routes require authentication
router.use(authenticate);

router.get('/',           ctrl.list);
router.get('/:slug',      ctrl.getBySlug);

module.exports = router;
