const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/users.controller');

// All user routes require authentication
router.use(authenticate);

router.get('/',
  requirePermission('users:view'),
  ctrl.list
);

router.post('/',
  requirePermission('users:create'),
  ctrl.createUserValidation,
  ctrl.create
);

router.get('/:id',
  requirePermission('users:view'),
  ctrl.getOne
);

router.put('/:id',
  requirePermission('users:edit'),
  ctrl.updateUserValidation,
  ctrl.update
);

router.patch('/:id/deactivate',
  requirePermission('users:deactivate'),
  ctrl.deactivate
);

router.patch('/:id/activate',
  requirePermission('users:deactivate'),
  ctrl.activate
);

router.patch('/:id/reset-password',
  requirePermission('users:edit'),
  ctrl.resetPasswordValidation,
  ctrl.resetPassword
);

module.exports = router;
