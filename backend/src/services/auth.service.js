const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { AUDIT_ACTIONS, log: auditLog } = require('./audit.service');

const SALT_ROUNDS = 12;
const FAILED_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

const failedAttempts = new Map();

function recordFailure(email) {
  const now = Date.now();
  const rec = failedAttempts.get(email) || { count: 0, firstAt: now };
  if (now - rec.firstAt > FAILED_ATTEMPT_WINDOW_MS) { rec.count = 0; rec.firstAt = now; }
  rec.count++;
  failedAttempts.set(email, rec);
  return rec.count;
}
function clearFailures(email) { failedAttempts.delete(email); }
function isLockedOut(email) {
  const rec = failedAttempts.get(email);
  if (!rec) return false;
  if (Date.now() - rec.firstAt > FAILED_ATTEMPT_WINDOW_MS) { failedAttempts.delete(email); return false; }
  return rec.count >= MAX_FAILED_ATTEMPTS;
}

function generateTokens(user) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
  const refreshToken = jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
}

async function login(email, password, ipAddress, userAgent) {
  const trimmedEmail = (email || '').trim().toLowerCase();

  if (isLockedOut(trimmedEmail)) {
    await auditLog({ action: AUDIT_ACTIONS.LOGIN_FAILED, resource: `email:${trimmedEmail}`, ipAddress, userAgent, success: false, detail: 'Account locked' });
    throw Object.assign(new Error('Too many failed login attempts. Please wait 15 minutes.'), { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where:  { email: trimmedEmail },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true, passwordHash: true, deletedAt: true },
  });

  const genericError = Object.assign(new Error('Invalid email or password'), { status: 401 });

  if (!user || user.deletedAt) {
    recordFailure(trimmedEmail);
    await auditLog({ action: AUDIT_ACTIONS.LOGIN_FAILED, resource: `email:${trimmedEmail}`, ipAddress, userAgent, success: false, detail: 'User not found' });
    throw genericError;
  }

  if (!user.active) {
    await auditLog({ userId: user.id, action: AUDIT_ACTIONS.LOGIN_FAILED, ipAddress, userAgent, success: false, detail: 'Account inactive' });
    throw Object.assign(new Error('Account is deactivated. Please contact an administrator.'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const count = recordFailure(trimmedEmail);
    await auditLog({ userId: user.id, action: AUDIT_ACTIONS.LOGIN_FAILED, ipAddress, userAgent, success: false, detail: `Failed attempt ${count}/${MAX_FAILED_ATTEMPTS}` });
    throw genericError;
  }

  clearFailures(trimmedEmail);

  const { accessToken, refreshToken } = generateTokens(user);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await Promise.all([
    prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ipAddress || null, loginCount: { increment: 1 } } }),
    auditLog({ userId: user.id, action: AUDIT_ACTIONS.LOGIN, ipAddress, userAgent, success: true }),
  ]);

  const { passwordHash: _, ...safeUser } = user;
  logger.info(`Login: ${user.email} from ${ipAddress}`);
  return { user: safeUser, accessToken, refreshToken };
}

async function logout(userId, refreshToken, ipAddress) {
  if (refreshToken) await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  await auditLog({ userId, action: AUDIT_ACTIONS.LOGOUT, ipAddress, success: true });
}

async function refreshAccessToken(token) {
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
  catch { throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 }); }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || new Date() > stored.expiresAt) throw Object.assign(new Error('Refresh token expired or revoked'), { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, role: true, active: true } });
  if (!user || !user.active) throw Object.assign(new Error('User not found or inactive'), { status: 401 });

  const { accessToken, refreshToken: newRefresh } = generateTokens(user);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { token } }),
    prisma.refreshToken.create({ data: { userId: user.id, token: newRefresh, expiresAt } }),
  ]);

  return { accessToken, refreshToken: newRefresh };
}

async function changePassword(userId, currentPassword, newPassword, ipAddress) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, passwordHash: true } });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Current password is incorrect'), { status: 400 });
  if (newPassword.length < 8) throw Object.assign(new Error('New password must be at least 8 characters'), { status: 400 });

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await auditLog({ userId, action: AUDIT_ACTIONS.PASSWORD_CHANGE, ipAddress, success: true });
}

async function getMe(userId) {
  return prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, active: true, lastLoginAt: true, loginCount: true, createdAt: true },
  });
}

async function hashPassword(password) { return bcrypt.hash(password, SALT_ROUNDS); }

module.exports = { login, logout, refreshAccessToken, changePassword, getMe, hashPassword, generateTokens };
