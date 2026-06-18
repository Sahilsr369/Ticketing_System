const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/reports.controller');

router.use(authenticate);
router.use(requirePermission('reports:view'));

router.get('/volumes',     ctrl.volumes);
router.get('/status',      ctrl.status);
router.get('/categories',  ctrl.categories);
router.get('/performance', ctrl.performance);
router.get('/export',      ctrl.exportData);
router.get('/sla',         ctrl.sla);         // Phase 4 compat

module.exports = router;
