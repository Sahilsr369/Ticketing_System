const prisma       = require('../utils/prisma');
const { hashPassword } = require('./auth.service');
const logger       = require('../utils/logger');
const { AUDIT_ACTIONS, log: auditLog } = require('./audit.service');

/**
 * List all users — managers and above only.
 */
async function listUsers({ page = 1, pageSize = 50, search, role, active } = {}) {
  const safePage     = Math.max(1, page);
  const safePageSize = Math.min(100, pageSize);
  const skip = (safePage - 1) * safePageSize;

  const where = {
    ...(search ? {
      OR: [
        { firstName: { contains: search.trim(), mode: 'insensitive' } },
        { lastName:  { contains: search.trim(), mode: 'insensitive' } },
        { email:     { contains: search.trim(), mode: 'insensitive' } },
      ],
    } : {}),
    ...(role   !== undefined ? { role }   : {}),
    ...(active !== undefined ? { active } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: safePageSize,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true, firstName: true, lastName: true,
        email: true, role: true, active: true,
        createdAt: true, updatedAt: true,
        _count: { select: { submittedTickets: true, assignedTickets: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page: safePage, pageSize: safePageSize, totalPages: Math.ceil(total / safePageSize) };
}

/**
 * Get single user by ID.
 */
async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, role: true, active: true,
      createdAt: true, updatedAt: true,
      _count: { select: { submittedTickets: true, assignedTickets: true } },
    },
  });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return user;
}

/**
 * Create a new user.
 */
async function createUser({ firstName, lastName, email, password, role }, actorId) {
  const trimmedEmail = (email || '').trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (existing) throw Object.assign(new Error('Email already in use'), { status: 409 });

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     trimmedEmail,
      passwordHash,
      role,
      active: true,
    },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, role: true, active: true, createdAt: true,
    },
  });

  logger.info(`User created: ${user.email} (${user.role}) by ${actorId}`);
  await auditLog({ userId: actorId, action: AUDIT_ACTIONS.USER_CREATED, resource: `user:${user.id}`, success: true, detail: `Created ${user.email} as ${user.role}` });
  return user;
}

/**
 * Update user details.
 */
async function updateUser(id, { firstName, lastName, email, role }, actorId) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('User not found'), { status: 404 });

  // Check email uniqueness if changing it
  if (email && email.trim().toLowerCase() !== existing.email) {
    const conflict = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (conflict) throw Object.assign(new Error('Email already in use'), { status: 409 });
  }

  const data = {};
  if (firstName) data.firstName = firstName.trim();
  if (lastName)  data.lastName  = lastName.trim();
  if (email)     data.email     = email.trim().toLowerCase();
  if (role)      data.role      = role;

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, firstName: true, lastName: true,
      email: true, role: true, active: true, updatedAt: true,
    },
  });

  logger.info(`User updated: ${user.email} by ${actorId}`);
  await auditLog({ userId: actorId, action: AUDIT_ACTIONS.USER_UPDATED, resource: `user:${user.id}`, success: true });
  return user;
}

/**
 * Activate or deactivate a user.
 */
async function setUserActive(id, active, actorId) {
  if (id === actorId) {
    throw Object.assign(new Error('You cannot deactivate your own account'), { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data:  { active },
    select: { id: true, email: true, active: true },
  });

  // Revoke all refresh tokens if deactivating
  if (!active) {
    await prisma.refreshToken.deleteMany({ where: { userId: id } });
  }

  logger.info(`User ${active ? 'activated' : 'deactivated'}: ${updated.email} by ${actorId}`);
  await auditLog({
    userId: actorId,
    action: active ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED,
    resource: `user:${updated.id}`,
    success: true,
  });
  return updated;
}

/**
 * Admin password reset — no current password required.
 */
async function adminResetPassword(id, newPassword, actorId) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await prisma.refreshToken.deleteMany({ where: { userId: id } });

  await auditLog({
    userId:   actorId,
    action:   AUDIT_ACTIONS.PASSWORD_RESET_BY_ADMIN,
    resource: `user:${id}`,
    success:  true,
    detail:   `Password reset for ${user.email} by admin`,
  });

  logger.info(`Password reset for ${user.email} by admin ${actorId}`);
}

module.exports = { listUsers, getUserById, createUser, updateUser, setUserActive, adminResetPassword };
