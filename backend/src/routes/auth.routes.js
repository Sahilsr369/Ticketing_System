const router = require('express').Router();
const { authenticate }  = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

router.post('/login',           ctrl.loginValidation,          ctrl.login);
router.post('/logout',          ctrl.logout);
router.post('/refresh',         ctrl.refresh);
router.get('/me',               authenticate,                  ctrl.me);
router.post('/change-password', authenticate, ctrl.changePasswordValidation, ctrl.changePassword);

module.exports = router;
