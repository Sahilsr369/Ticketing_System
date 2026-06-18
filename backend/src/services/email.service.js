/**
 * Email Service — Phase 6
 *
 * Handles:
 *   sendTicketEmail()    — compose, send via SMTP, persist to DB, log activity
 *   receiveEmail()       — persist an inbound email + log activity
 *   getTicketEmails()    — list all emails for a ticket (newest first)
 *   getEmailById()       — single email with full body
 *   buildReplyDefaults() — pre-fill To/Subject from the last email in thread
 */
const { v4: uuidv4 }    = require('uuid');
const prisma             = require('../utils/prisma');
const logger             = require('../utils/logger');
const { sendMail }       = require('../utils/mailer');
const { EVENT, logEvent }= require('./activity.service');

const EMAIL_SELECT = {
  id: true, direction: true,
  fromAddress: true, toAddress: true, cc: true,
  subject: true, body: true, bodyHtml: true,
  messageId: true, inReplyTo: true,
  sentAt: true, createdAt: true,
  sentBy: { select: { id: true, firstName: true, lastName: true, email: true } },
};

// ─── Send an email from a ticket ─────────────────────────────────────────────
async function sendTicketEmail({ ticketId, sentById, to, cc, subject, body, bodyHtml, inReplyTo }) {
  // Validate ticket exists
  const ticket = await prisma.ticket.findUnique({
    where:  { id: ticketId },
    select: { id: true, ticketNumber: true, title: true },
  });
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  const sender = await prisma.user.findUnique({
    where:  { id: sentById },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!sender) throw Object.assign(new Error('Sender not found'), { status: 400 });

  const fromAddress = process.env.EMAIL_FROM || `IT Helpdesk <helpdesk@example.com>`;
  const messageId   = `<${uuidv4()}@helpdesk.local>`;

  // Append ticket reference to subject if not already there
  const ticketRef    = `[${ticket.ticketNumber}]`;
  const fullSubject  = subject.includes(ticketRef) ? subject : `${ticketRef} ${subject}`;

  // Send via SMTP (gracefully skipped if not configured)
  const smtpResult = await sendMail({
    from:      fromAddress,
    to,
    cc:        cc || undefined,
    subject:   fullSubject,
    text:      body,
    html:      bodyHtml || `<pre style="font-family:sans-serif;white-space:pre-wrap">${body}</pre>`,
    inReplyTo: inReplyTo || undefined,
    references:inReplyTo ? `${inReplyTo} ${messageId}` : messageId,
  });

  // Persist to DB
  const email = await prisma.ticketEmail.create({
    data: {
      ticketId,
      direction:   'SENT',
      fromAddress,
      toAddress:   Array.isArray(to) ? to.join(', ') : to,
      cc:          cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : null,
      subject:     fullSubject,
      body,
      bodyHtml:    bodyHtml || null,
      messageId:   smtpResult.messageId || messageId,
      inReplyTo:   inReplyTo            || null,
      sentAt:      new Date(),
      sentById,
    },
    select: EMAIL_SELECT,
  });

  // Log to unified activity feed
  await logEvent({
    ticketId,
    userId:    sentById,
    eventType: EVENT.EMAIL_SENT,
    detail:    `Email sent to ${email.toAddress}: ${fullSubject}`,
    metadata:  {
      emailId:     email.id,
      direction:   'sent',
      subject:     fullSubject,
      fromAddress,
      toAddress:   email.toAddress,
      cc:          email.cc,
      skipped:     smtpResult.skipped || false,
    },
  });

  logger.info(`Email sent for ticket ${ticket.ticketNumber} to ${email.toAddress}`);
  return { email, smtp: smtpResult };
}

// ─── Record an inbound email ──────────────────────────────────────────────────
async function receiveEmail({ ticketId, fromAddress, toAddress, cc, subject, body, bodyHtml, messageId, inReplyTo, sentAt }) {
  const ticket = await prisma.ticket.findUnique({
    where:  { id: ticketId },
    select: { id: true, ticketNumber: true },
  });
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  const email = await prisma.ticketEmail.create({
    data: {
      ticketId,
      direction:  'RECEIVED',
      fromAddress,
      toAddress:  toAddress || '',
      cc:         cc        || null,
      subject:    subject   || '(no subject)',
      body:       body      || '',
      bodyHtml:   bodyHtml  || null,
      messageId:  messageId || null,
      inReplyTo:  inReplyTo || null,
      sentAt:     sentAt    ? new Date(sentAt) : new Date(),
      sentById:   null,
    },
    select: EMAIL_SELECT,
  });

  await logEvent({
    ticketId,
    userId:    null,
    eventType: EVENT.EMAIL_RECEIVED,
    detail:    `Email received from ${fromAddress}: ${subject}`,
    metadata:  {
      emailId:     email.id,
      direction:   'received',
      subject:     email.subject,
      fromAddress,
      toAddress:   email.toAddress,
      cc:          email.cc,
    },
  });

  logger.info(`Inbound email recorded for ticket ${ticket.ticketNumber} from ${fromAddress}`);
  return email;
}

// ─── List emails for a ticket ─────────────────────────────────────────────────
async function getTicketEmails(ticketId) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  return prisma.ticketEmail.findMany({
    where:   { ticketId },
    orderBy: { sentAt: 'desc' },
    select:  EMAIL_SELECT,
  });
}

// ─── Single email with full body ──────────────────────────────────────────────
async function getEmailById(emailId, ticketId) {
  const email = await prisma.ticketEmail.findFirst({
    where:  { id: emailId, ticketId },
    select: { ...EMAIL_SELECT, bodyHtml: true },
  });
  if (!email) throw Object.assign(new Error('Email not found'), { status: 404 });
  return email;
}

// ─── Pre-fill reply defaults from last email in thread ───────────────────────
async function buildReplyDefaults(ticketId) {
  const ticket = await prisma.ticket.findUnique({
    where:  { id: ticketId },
    select: { ticketNumber: true, title: true, submittedBy: { select: { email: true, firstName: true, lastName: true } } },
  });
  if (!ticket) return {};

  // Find the most recent email in the thread
  const last = await prisma.ticketEmail.findFirst({
    where:   { ticketId },
    orderBy: { sentAt: 'desc' },
    select:  { fromAddress: true, toAddress: true, subject: true, messageId: true, direction: true },
  });

  // Default: reply to submitter if no prior email
  const replyTo = last
    ? (last.direction === 'RECEIVED' ? last.fromAddress : last.toAddress)
    : ticket.submittedBy.email;

  const subject = last
    ? (last.subject.startsWith('Re:') ? last.subject : `Re: ${last.subject}`)
    : `Re: [${ticket.ticketNumber}] ${ticket.title}`;

  return {
    to:        replyTo,
    subject,
    inReplyTo: last?.messageId || null,
  };
}

module.exports = {
  sendTicketEmail,
  receiveEmail,
  getTicketEmails,
  getEmailById,
  buildReplyDefaults,
};
