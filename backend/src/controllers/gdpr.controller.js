const XLSX   = require('xlsx');
const prisma = require('../utils/prisma');
const { ok, forbidden, notFound } = require('../utils/response');
const { AUDIT_ACTIONS, log: auditLog, getIp } = require('../services/audit.service');

async function exportMyData(req, res, next) {
  try {
    const userId = req.user.id;
    const ip = getIp(req);

    const [user, tickets, comments, auditLogs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true, lastLoginAt: true, loginCount: true } }),
      prisma.ticket.findMany({ where: { submittedById: userId }, select: { ticketNumber: true, title: true, status: true, priority: true, createdAt: true, resolvedAt: true }, orderBy: { createdAt: 'desc' } }),
      prisma.comment.findMany({ where: { authorId: userId }, select: { body: true, createdAt: true, ticket: { select: { ticketNumber: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.auditLog.findMany({ where: { userId }, select: { action: true, ipAddress: true, success: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
      'ID': user.id, 'First Name': user.firstName, 'Last Name': user.lastName,
      'Email': user.email, 'Role': user.role, 'Created': user.createdAt?.toISOString(),
      'Last Login': user.lastLoginAt?.toISOString(), 'Login Count': user.loginCount,
    }]), 'Profile');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tickets.map(t => ({
      'Ticket': t.ticketNumber, 'Title': t.title, 'Status': t.status, 'Priority': t.priority,
      'Created': t.createdAt?.toISOString(), 'Resolved': t.resolvedAt?.toISOString(),
    }))), 'Tickets');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comments.map(c => ({
      'Ticket': c.ticket?.ticketNumber, 'Comment': c.body, 'At': c.createdAt?.toISOString(),
    }))), 'Comments');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auditLogs.map(a => ({
      'Action': a.action, 'IP': a.ipAddress, 'Success': a.success, 'At': a.createdAt?.toISOString(),
    }))), 'Audit Log');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    await auditLog({ userId, action: AUDIT_ACTIONS.DATA_EXPORT, resource: `user:${userId}`, ipAddress: ip, success: true });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="my-data-${Date.now()}.xlsx"`);
    return res.send(buf);
  } catch (err) { next(err); }
}

async function anonymiseUser(req, res, next) {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return forbidden(res, 'Only Super Admins can anonymise user data');
    const { userId } = req.params;
    const ip = getIp(req);

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return notFound(res, 'User not found');
    if (target.id === req.user.id) return forbidden(res, 'Cannot anonymise your own account');

    const anon = `anon_${userId.slice(0, 8)}`;
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { firstName: 'Anonymised', lastName: 'User', email: `${anon}@deleted.local`, active: false, deletedAt: new Date(), anonymisedAt: new Date() } }),
      prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);

    await auditLog({ userId: req.user.id, action: AUDIT_ACTIONS.DATA_ANONYMISE, resource: `user:${userId}`, ipAddress: ip, success: true, detail: `User ${target.email} anonymised by ${req.user.email}` });
    return ok(res, null, 'User data anonymised');
  } catch (err) { next(err); }
}

module.exports = { exportMyData, anonymiseUser };
