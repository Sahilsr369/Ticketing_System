/**
 * Mailer utility — Phase 6
 * Wraps nodemailer with SMTP config from environment variables.
 * Provides a verified transporter and a send helper.
 */
const nodemailer = require('nodemailer');
const logger     = require('./logger');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn('SMTP not configured — email sending disabled. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    return null;
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
    tls: { rejectUnauthorized: false }, // dev-friendly; set true in production
  });

  return _transporter;
}

/**
 * Send an email.
 * Returns { messageId, accepted, rejected } on success.
 * Returns { error, skipped: true } when SMTP is not configured (dev mode).
 */
async function sendMail({ from, to, cc, subject, text, html, replyTo, inReplyTo, references }) {
  const transporter = getTransporter();

  if (!transporter) {
    logger.warn(`[EMAIL SKIPPED — no SMTP] To: ${to} | Subject: ${subject}`);
    return {
      skipped:   true,
      messageId: `<dev-${Date.now()}@helpdesk.local>`,
      accepted:  Array.isArray(to) ? to : [to],
      rejected:  [],
    };
  }

  const fromAddress = from || process.env.EMAIL_FROM || `IT Helpdesk <helpdesk@example.com>`;

  const result = await transporter.sendMail({
    from:       fromAddress,
    to,
    cc:         cc         || undefined,
    subject,
    text,
    html:       html       || undefined,
    replyTo:    replyTo    || fromAddress,
    inReplyTo:  inReplyTo  || undefined,
    references: references || undefined,
  });

  logger.info(`[EMAIL SENT] To: ${to} | Subject: ${subject} | MessageId: ${result.messageId}`);
  return result;
}

/**
 * Verify SMTP connection. Used by /health and settings page.
 */
async function verifySmtp() {
  const transporter = getTransporter();
  if (!transporter) return { configured: false, ok: false, message: 'SMTP not configured' };
  try {
    await transporter.verify();
    return { configured: true, ok: true, message: 'SMTP connection verified' };
  } catch (err) {
    return { configured: true, ok: false, message: err.message };
  }
}

// Reset cached transporter (used when SMTP settings change at runtime)
function resetTransporter() { _transporter = null; }

module.exports = { sendMail, verifySmtp, resetTransporter };
