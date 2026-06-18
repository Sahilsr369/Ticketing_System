const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const AUDIT_ACTIONS = {
  LOGIN:            'LOGIN',
  LOGIN_FAILED:     'LOGIN_FAILED',
  LOGOUT:           'LOGOUT',
  TOKEN_REFRESH:    'TOKEN_REFRESH',
  PASSWORD_CHANGE:  'PASSWORD_CHANGE',
  USER_CREATED:     'USER_CREATED',
  USER_UPDATED:     'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_ACTIVATED:   'USER_ACTIVATED',
  PASSWORD_RESET_BY_ADMIN: 'PASSWORD_RESET_BY_ADMIN',
  DATA_EXPORT:      'DATA_EXPORT',
  DATA_DELETION:    'DATA_DELETION',
  DATA_ANONYMISE:   'DATA_ANONYMISE',
  TICKET_DELETED:   'TICKET_DELETED',
  BULK_IMPORT:      'BULK_IMPORT',
  BULK_EXPORT:      'BULK_EXPORT',
};

async function log({ userId, action, resource, ipAddress, userAgent, success = true, detail }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId:    userId    || null,
        action,
        resource:  resource  || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
        success,
        detail:    detail    || null,
      },
    });
  } catch (err) {
    logger.error(`Audit log write failed: ${err.message}`);
  }
}

function getIp(req) {
  return req.ip || req.connection?.remoteAddress || null;
}

async function getAuditLogs({ userId, action, dateFrom, dateTo, page = 1, pageSize = 50 } = {}) {
  const where = {
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
    ...(dateFrom || dateTo ? {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
      },
    } : {}),
  };

  const skip = (Math.max(1, page) - 1) * Math.min(100, pageSize);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, skip, take: Math.min(100, pageSize),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, action: true, resource: true,
        ipAddress: true, success: true, detail: true, createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page: Math.max(1, page), pageSize: Math.min(100, pageSize), totalPages: Math.ceil(total / Math.min(100, pageSize)) };
}

module.exports = { AUDIT_ACTIONS, log, getIp, getAuditLogs };
