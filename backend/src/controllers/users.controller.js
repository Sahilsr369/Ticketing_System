const { body, param, query } = require('express-validator');
const { validate }   = require('../middleware/validate');
const usersService   = require('../services/users.service');
const { ok, created, badRequest, notFound, conflict } = require('../utils/response');

const VALID_ROLES = ['SUPER_ADMIN','IT_MANAGER','IT_TECHNICIAN','REPORTING_USER','STANDARD_USER'];

// ─── Validation chains ────────────────────────────────────────────────────────

const createUserValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('role').isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
  validate,
];

const updateUserValidation = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
  validate,
];

const resetPasswordValidation = [
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  validate,
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function list(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, parseInt(req.query.pageSize, 10) || 50);
    const search   = (req.query.search || '').trim() || undefined;
    const role     = req.query.role   || undefined;
    const active   = req.query.active !== undefined ? req.query.active === 'true' : undefined;

    const result = await usersService.listUsers({ page, pageSize, search, role, active });
    return ok(res, result);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    return ok(res, user);
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    const user = await usersService.createUser(
      { firstName, lastName, email, password, role },
      req.user.id
    );
    return created(res, user, 'User created');
  } catch (err) {
    if (err.status === 409) return conflict(res, err.message);
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { firstName, lastName, email, role } = req.body;
    const user = await usersService.updateUser(
      req.params.id,
      { firstName, lastName, email, role },
      req.user.id
    );
    return ok(res, user, 'User updated');
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    if (err.status === 409) return conflict(res, err.message);
    next(err);
  }
}

async function deactivate(req, res, next) {
  try {
    const user = await usersService.setUserActive(req.params.id, false, req.user.id);
    return ok(res, user, 'User deactivated');
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    if (err.status === 400) return badRequest(res, err.message);
    next(err);
  }
}

async function activate(req, res, next) {
  try {
    const user = await usersService.setUserActive(req.params.id, true, req.user.id);
    return ok(res, user, 'User activated');
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    await usersService.adminResetPassword(req.params.id, req.body.newPassword, req.user.id);
    return ok(res, {}, 'Password reset successfully');
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    next(err);
  }
}

module.exports = {
  createUserValidation, create,
  updateUserValidation, update,
  resetPasswordValidation, resetPassword,
  list, getOne, deactivate, activate,
};
