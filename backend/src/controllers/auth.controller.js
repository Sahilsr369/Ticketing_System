const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const authService  = require('../services/auth.service');
const { ok, badRequest } = require('../utils/response');

const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validate,
];

async function login(req, res, next) {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const ua = req.headers['user-agent'] || null;
    const { user, accessToken, refreshToken } = await authService.login(req.body.email, req.body.password, ip, ua);
    res.json({ success: true, data: { user, accessToken, refreshToken }, message: `Welcome back, ${user.firstName}` });
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ success: false, error: { message: err.message } });
    if (err.status === 429) return res.status(429).json({ success: false, error: { message: err.message } });
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user?.id, req.body.refreshToken, req.ip || null);
    return ok(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return badRequest(res, 'Refresh token is required');
    const tokens = await authService.refreshAccessToken(refreshToken);
    return ok(res, tokens);
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ success: false, error: { message: err.message } });
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    return ok(res, user);
  } catch (err) { next(err); }
}

async function changePassword(req, res, next) {
  try {
    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword, req.ip || null);
    return ok(res, null, 'Password changed successfully');
  } catch (err) {
    if (err.status === 400) return badRequest(res, err.message);
    next(err);
  }
}

module.exports = { loginValidation, login, logout, refresh, me, changePasswordValidation, changePassword };
