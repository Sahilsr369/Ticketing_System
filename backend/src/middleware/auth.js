const jwt    = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { unauthorized, forbidden } = require('../utils/response');

/**
 * Verifies Bearer JWT and attaches req.user.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return unauthorized(res, 'No token provided');

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, role: true, active: true,
      },
    });

    if (!user)        return unauthorized(res, 'User not found');
    if (!user.active) return unauthorized(res, 'Account is deactivated');

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return unauthorized(res, 'Token expired');
    if (err.name === 'JsonWebTokenError')  return unauthorized(res, 'Invalid token');
    next(err);
  }
}

/**
 * Role-based permission check middleware factory.
 * Usage: router.get('/admin', authenticate, requireRole('SUPER_ADMIN', 'IT_MANAGER'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Access denied — required role: ${roles.join(' or ')}`);
    }
    next();
  };
}

/**
 * Permission map — role → granted permissions
 */
const PERMISSIONS = {
  SUPER_ADMIN:    ['*'],  // wildcard — all permissions
  IT_MANAGER:     [
    'tickets:view_all', 'tickets:create', 'tickets:edit_all', 'tickets:assign',
    'users:view', 'users:create', 'users:edit', 'users:deactivate',
    'reports:view', 'reports:export', 'comments:internal',
  ],
  IT_TECHNICIAN:  [
    'tickets:view_assigned', 'tickets:create', 'tickets:edit_assigned',
    'tickets:assign', 'comments:internal', 'reports:view',
  ],
  REPORTING_USER: ['tickets:view_all', 'reports:view', 'reports:export'],
  STANDARD_USER:  ['tickets:create', 'tickets:view_own'],
};

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    const perms = PERMISSIONS[req.user.role] || [];
    if (perms.includes('*') || perms.includes(permission)) return next();
    return forbidden(res, `Missing permission: ${permission}`);
  };
}

module.exports = { authenticate, requireRole, requirePermission, PERMISSIONS };
