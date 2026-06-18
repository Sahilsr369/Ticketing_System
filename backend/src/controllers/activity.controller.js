const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { ok, notFound } = require('../utils/response');
const { getActivityFeed, logEmailEvent } = require('../services/activity.service');

const logEmailValidation = [
  body('direction').trim().isIn(['sent', 'received']).withMessage('direction must be "sent" or "received"'),
  body('subject').trim().notEmpty().withMessage('subject is required'),
  body('fromAddress').optional({ nullable: true }).trim(),
  body('toAddress').optional({ nullable: true }).trim(),
  body('bodyPreview').optional({ nullable: true }),
  validate,
];

async function feed(req, res, next) {
  try {
    const items = await getActivityFeed(req.params.id, req.user);
    return ok(res, items);
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    next(err);
  }
}

async function logEmail(req, res, next) {
  try {
    const { direction, subject, fromAddress, toAddress, bodyPreview } = req.body;
    await logEmailEvent({
      ticketId:    req.params.id,
      userId:      req.user.id,
      direction,
      subject:     subject.trim(),
      fromAddress: (fromAddress || '').trim(),
      toAddress:   (toAddress   || '').trim(),
      bodyPreview: bodyPreview  || null,
    });
    return ok(res, null, 'Email event logged');
  } catch (err) { next(err); }
}

module.exports = { logEmailValidation, feed, logEmail };
