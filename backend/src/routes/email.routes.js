const router = require('express').Router({ mergeParams: true });
const { authenticate, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/email.controller');

router.use(authenticate);

// All email operations require IT staff — standard users cannot send/receive
const requireITStaff = requirePermission('tickets:edit_all');

router.get   ('/',            ctrl.list);
router.get   ('/reply-defaults', ctrl.replyDefaults);
router.get   ('/smtp-status',    ctrl.smtpStatus);
router.get   ('/:emailId',    ctrl.getOne);
router.post  ('/send',        requireITStaff, ctrl.sendValidation, ctrl.send);
router.post  ('/receive',     requireITStaff, ctrl.receiveValidation, ctrl.receive);

module.exports = router;
