const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const emailService = require('../services/email.service');
const { verifySmtp } = require('../utils/mailer');
const { ok, created, notFound, badRequest } = require('../utils/response');

// ─── Validation ───────────────────────────────────────────────────────────────
const sendValidation = [
  body('to').trim().notEmpty().withMessage('Recipient (to) is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('body').trim().notEmpty().withMessage('Body is required'),
  body('cc').optional({ nullable: true }).trim(),
  body('bodyHtml').optional({ nullable: true }),
  body('inReplyTo').optional({ nullable: true }),
  validate,
];

const receiveValidation = [
  body('fromAddress').trim().notEmpty().withMessage('fromAddress is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('body').trim().notEmpty().withMessage('Body is required'),
  body('toAddress').optional({ nullable: true }).trim(),
  body('cc').optional({ nullable: true }).trim(),
  body('bodyHtml').optional({ nullable: true }),
  body('messageId').optional({ nullable: true }),
  body('inReplyTo').optional({ nullable: true }),
  body('sentAt').optional({ nullable: true }).isISO8601().withMessage('sentAt must be a valid ISO date'),
  validate,
];

// ─── Handlers ─────────────────────────────────────────────────────────────────
async function list(req, res, next) {
  try {
    const emails = await emailService.getTicketEmails(req.params.id);
    return ok(res, emails);
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const email = await emailService.getEmailById(req.params.emailId, req.params.id);
    return ok(res, email);
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    next(err);
  }
}

async function send(req, res, next) {
  try {
    const { to, cc, subject, body: emailBody, bodyHtml, inReplyTo } = req.body;
    const result = await emailService.sendTicketEmail({
      ticketId: req.params.id,
      sentById: req.user.id,
      to:       (to || '').trim(),
      cc:       cc ? cc.trim() : null,
      subject:  (subject || '').trim(),
      body:     (emailBody || '').trim(),
      bodyHtml: bodyHtml || null,
      inReplyTo:inReplyTo || null,
    });
    return created(res, result.email, result.smtp.skipped ? 'Email saved (SMTP not configured)' : 'Email sent');
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    if (err.status === 400) return badRequest(res, err.message);
    next(err);
  }
}

async function receive(req, res, next) {
  try {
    const { fromAddress, toAddress, cc, subject, body: emailBody, bodyHtml, messageId, inReplyTo, sentAt } = req.body;
    const email = await emailService.receiveEmail({
      ticketId: req.params.id,
      fromAddress: (fromAddress || '').trim(),
      toAddress:   toAddress   ? toAddress.trim()   : null,
      cc:          cc          ? cc.trim()           : null,
      subject:     (subject    || '').trim(),
      body:        (emailBody  || '').trim(),
      bodyHtml:    bodyHtml    || null,
      messageId:   messageId   || null,
      inReplyTo:   inReplyTo   || null,
      sentAt,
    });
    return created(res, email, 'Inbound email recorded');
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    next(err);
  }
}

async function replyDefaults(req, res, next) {
  try {
    const defaults = await emailService.buildReplyDefaults(req.params.id);
    return ok(res, defaults);
  } catch (err) { next(err); }
}

async function smtpStatus(req, res, next) {
  try {
    const status = await verifySmtp();
    return ok(res, status);
  } catch (err) { next(err); }
}

module.exports = { sendValidation, receiveValidation, list, getOne, send, receive, replyDefaults, smtpStatus };
