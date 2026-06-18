/**
 * Activity Service — Phase 8 (fixed duplicate comment bug)
 *
 * FIX: getActivityFeed() no longer merges Comment rows separately.
 * addComment() in tickets.service already writes an ActivityLog event
 * with eventType COMMENT_ADDED/INTERNAL_NOTE and the full body as `detail`.
 * Merging Comment rows on top caused every comment to appear twice.
 */
const prisma = require('../utils/prisma');

const EVENT = {
  TICKET_CREATED:   'TICKET_CREATED',
  TICKET_ASSIGNED:  'TICKET_ASSIGNED',
  TICKET_UNASSIGNED:'TICKET_UNASSIGNED',
  STATUS_CHANGED:   'STATUS_CHANGED',
  PRIORITY_CHANGED: 'PRIORITY_CHANGED',
  FIELD_UPDATED:    'FIELD_UPDATED',
  COMMENT_ADDED:    'COMMENT_ADDED',
  INTERNAL_NOTE:    'INTERNAL_NOTE',
  EMAIL_SENT:       'EMAIL_SENT',
  EMAIL_RECEIVED:   'EMAIL_RECEIVED',
  TICKET_CLOSED:    'TICKET_CLOSED',
  TICKET_REOPENED:  'TICKET_REOPENED',
};

const EVENT_META = {
  TICKET_CREATED:   { icon: 'create',    color: '#4f7cff', label: 'Ticket Created'    },
  TICKET_ASSIGNED:  { icon: 'person',    color: '#2ecc8f', label: 'Assigned'          },
  TICKET_UNASSIGNED:{ icon: 'person_off',color: '#9399b0', label: 'Unassigned'        },
  STATUS_CHANGED:   { icon: 'swap',      color: '#f0a030', label: 'Status Changed'    },
  PRIORITY_CHANGED: { icon: 'flag',      color: '#f0a030', label: 'Priority Changed'  },
  FIELD_UPDATED:    { icon: 'edit',      color: '#6b95ff', label: 'Updated'           },
  COMMENT_ADDED:    { icon: 'comment',   color: '#20d4d4', label: 'Comment'           },
  INTERNAL_NOTE:    { icon: 'lock',      color: '#9b6fff', label: 'Internal Note'     },
  EMAIL_SENT:       { icon: 'send',      color: '#2ecc8f', label: 'Email Sent'        },
  EMAIL_RECEIVED:   { icon: 'inbox',     color: '#4f7cff', label: 'Email Received'    },
  TICKET_CLOSED:    { icon: 'check',     color: '#5a6080', label: 'Ticket Closed'     },
  TICKET_REOPENED:  { icon: 'refresh',   color: '#9b6fff', label: 'Ticket Reopened'   },
};

async function logEvent({ ticketId, userId, eventType, detail, metadata = null, isInternal = false }) {
  return prisma.activityLog.create({
    data: {
      ticketId:   ticketId  || null,
      userId:     userId    || null,
      eventType,
      action:     eventType,
      detail:     detail    || null,
      metadata:   metadata  || undefined,
      isInternal,
    },
  });
}

async function logEmailEvent({ ticketId, userId, direction, subject, fromAddress, toAddress, bodyPreview = null }) {
  const eventType = direction === 'sent' ? EVENT.EMAIL_SENT : EVENT.EMAIL_RECEIVED;
  const detail    = direction === 'sent'
    ? `Email sent to ${toAddress}: ${subject}`
    : `Email received from ${fromAddress}: ${subject}`;

  return logEvent({
    ticketId, userId, eventType, detail,
    metadata: { direction, subject, fromAddress, toAddress, bodyPreview },
    isInternal: false,
  });
}

/**
 * Returns the unified activity feed for a ticket — newest first.
 *
 * SOURCE: ActivityLog only.
 * Comments are already present as COMMENT_ADDED/INTERNAL_NOTE events
 * (written by addComment in tickets.service). We do NOT separately merge
 * the Comment table to avoid showing each comment twice.
 */
async function getActivityFeed(ticketId, requestingUser = null) {
  const canSeeInternal = requestingUser
    ? ['SUPER_ADMIN','IT_MANAGER','IT_TECHNICIAN'].includes(requestingUser.role)
    : true;

  const logs = await prisma.activityLog.findMany({
    where: {
      ticketId,
      ...(canSeeInternal ? {} : { isInternal: false }),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, eventType: true, action: true, detail: true,
      metadata: true, isInternal: true, createdAt: true,
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  return logs.map(log => {
    const meta = EVENT_META[log.eventType] || EVENT_META.FIELD_UPDATED;
    const isComment = log.eventType === 'COMMENT_ADDED' || log.eventType === 'INTERNAL_NOTE';
    return {
      id:         log.id,
      type:       isComment ? 'comment' : 'event',
      eventType:  log.eventType,
      icon:       meta.icon,
      color:      meta.color,
      label:      meta.label,
      detail:     log.detail,
      metadata:   log.metadata,
      isInternal: log.isInternal,
      user:       log.user || null,
      createdAt:  log.createdAt,
    };
  });
}

module.exports = { EVENT, EVENT_META, logEvent, logEmailEvent, getActivityFeed };
