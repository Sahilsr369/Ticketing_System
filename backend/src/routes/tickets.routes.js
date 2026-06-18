const router   = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const ctrl     = require('../controllers/tickets.controller');
const slaCtrl  = require('../controllers/sla.controller');
const actCtrl  = require('../controllers/activity.controller');

router.use(authenticate);

// Dashboard
router.get('/dashboard', ctrl.dashboard);

// List & create
router.get('/',  ctrl.list);
router.post('/', requirePermission('tickets:create'), ctrl.createValidation, ctrl.create);

// Single ticket
router.get('/:id',    ctrl.getOne);
router.put('/:id',    ctrl.updateValidation, ctrl.update);
router.delete('/:id', ctrl.remove);

// Sub-actions
router.patch('/:id/assign',   ctrl.assignValidation,  ctrl.assign);
router.patch('/:id/status',   ctrl.statusValidation,  ctrl.setStatus);
router.post ('/:id/comments', ctrl.commentValidation, ctrl.addComment);

// Phase 4: SLA lifecycle timeline
router.get('/:id/timeline', slaCtrl.timeline);

// Phase 5: unified activity feed
router.get ('/:id/activity',       actCtrl.feed);
router.post('/:id/activity/email', actCtrl.logEmailValidation, actCtrl.logEmail);

module.exports = router;
