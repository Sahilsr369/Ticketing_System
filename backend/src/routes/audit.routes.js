const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { ok } = require('../utils/response');
const { getAuditLogs } = require('../services/audit.service');

router.use(authenticate);
router.use(requirePermission('users:view'));

router.get('/', async (req, res, next) => {
  try {
    const data = await getAuditLogs({
      userId: req.query.userId || null,
      action: req.query.action || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      page: parseInt(req.query.page || '1', 10),
      pageSize: parseInt(req.query.pageSize || '50', 10),
    });
    return ok(res, data);
  } catch (err) { next(err); }
});

module.exports = router;
