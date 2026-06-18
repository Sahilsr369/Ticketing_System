/**
 * SLA Service — Phase 4
 *
 * Responsibilities:
 *  1. recordTransition()   — write a TicketHistory row on every status change
 *  2. checkAndUpdateSla()  — evaluate SLA breach flags after any status change
 *  3. getTicketTimeline()  — return full history + computed metrics for a ticket
 *  4. getSlaReport()       — aggregate SLA metrics across all tickets
 */
const prisma = require('../utils/prisma');

const HISTORY_SELECT = {
  id: true,
  previousStatus: true,
  newStatus: true,
  changedAt: true,
  durationInPreviousStateSeconds: true,
  note: true,
  changedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
};

// ─── 1. Record a status transition ───────────────────────────────────────────
/**
 * Call this immediately after any ticket status change.
 *
 * @param {string}      ticketId
 * @param {string|null} previousStatus  — null only for the initial LOGGED entry
 * @param {string}      newStatus
 * @param {string|null} changedById
 * @param {string|null} note
 * @param {Date}        previousStatusEnteredAt  — when the ticket entered previousStatus
 */
async function recordTransition(ticketId, previousStatus, newStatus, changedById, note = null, previousStatusEnteredAt = null) {
  let durationSeconds = null;

  if (previousStatus && previousStatusEnteredAt) {
    const ms = Date.now() - new Date(previousStatusEnteredAt).getTime();
    durationSeconds = Math.max(0, Math.round(ms / 1000));
  }

  await prisma.ticketHistory.create({
    data: {
      ticketId,
      previousStatus:  previousStatus  || null,
      newStatus,
      changedById:     changedById     || null,
      note:            note            || null,
      durationInPreviousStateSeconds: durationSeconds,
    },
  });
}

// ─── 2. Check and update SLA breach flags ─────────────────────────────────────
/**
 * Evaluates and persists slaBreached + firstResponseBreached on the ticket.
 * Called after every status/assignment change.
 */
async function checkAndUpdateSla(ticketId) {
  const ticket = await prisma.ticket.findUnique({
    where:  { id: ticketId },
    select: {
      id: true, priority: true, createdAt: true,
      firstResponseAt: true, resolvedAt: true, closedAt: true,
      slaBreached: true, firstResponseBreached: true,
    },
  });
  if (!ticket) return;

  const policy = await prisma.slaPolicy.findUnique({ where: { priority: ticket.priority } });
  if (!policy) return;

  const createdAt = new Date(ticket.createdAt);
  const now       = new Date();

  // First response breach: no firstResponseAt and elapsed > firstResponseMinutes
  const firstRespDeadline = new Date(createdAt.getTime() + policy.firstResponseMinutes * 60_000);
  const firstResponseBreached = !ticket.firstResponseAt && now > firstRespDeadline;

  // Resolution breach: not yet resolved/closed and elapsed > resolutionMinutes
  const resolutionDeadline = new Date(createdAt.getTime() + policy.resolutionMinutes * 60_000);
  const isResolved = !!(ticket.resolvedAt || ticket.closedAt);
  let slaBreached = ticket.slaBreached; // keep existing true

  if (!isResolved) {
    slaBreached = now > resolutionDeadline;
  } else {
    // Already resolved — check if it was resolved after the deadline
    const resolvedTime = new Date(ticket.resolvedAt || ticket.closedAt);
    slaBreached = resolvedTime > resolutionDeadline;
  }

  // Only write if something changed
  if (slaBreached !== ticket.slaBreached || firstResponseBreached !== ticket.firstResponseBreached) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data:  { slaBreached, firstResponseBreached },
    });
  }
}

// ─── 3. Get full ticket timeline + lifecycle metrics ─────────────────────────
async function getTicketTimeline(ticketId) {
  const [ticket, history, policy] = await Promise.all([
    prisma.ticket.findUnique({
      where:  { id: ticketId },
      select: {
        id: true, ticketNumber: true, priority: true, status: true,
        createdAt: true, firstResponseAt: true, resolvedAt: true, closedAt: true,
        slaBreached: true, firstResponseBreached: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.ticketHistory.findMany({
      where:   { ticketId },
      orderBy: { changedAt: 'asc' },
      select:  HISTORY_SELECT,
    }),
    prisma.ticket.findUnique({
      where:  { id: ticketId },
      select: { priority: true },
    }).then(t => t ? prisma.slaPolicy.findUnique({ where: { priority: t.priority } }) : null),
  ]);

  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  const createdAt = new Date(ticket.createdAt);
  const now       = new Date();

  // Time to first response (seconds)
  const timeToFirstResponseSeconds = ticket.firstResponseAt
    ? Math.round((new Date(ticket.firstResponseAt) - createdAt) / 1000)
    : null;

  // Time to resolution (seconds) — only when resolved
  const resolvedTime = ticket.resolvedAt || ticket.closedAt;
  const timeToResolutionSeconds = resolvedTime
    ? Math.round((new Date(resolvedTime) - createdAt) / 1000)
    : null;

  // Age of ticket (seconds, ongoing if not resolved)
  const ageSeconds = resolvedTime
    ? timeToResolutionSeconds
    : Math.round((now - createdAt) / 1000);

  // SLA targets
  const slaTargets = policy
    ? {
        firstResponseMinutes: policy.firstResponseMinutes,
        resolutionMinutes:    policy.resolutionMinutes,
        firstResponseDeadline: new Date(createdAt.getTime() + policy.firstResponseMinutes * 60_000).toISOString(),
        resolutionDeadline:    new Date(createdAt.getTime() + policy.resolutionMinutes    * 60_000).toISOString(),
      }
    : null;

  // % of resolution SLA consumed (capped at 100 when breached)
  let slaConsumedPercent = null;
  if (policy) {
    const elapsed = resolvedTime
      ? new Date(resolvedTime) - createdAt
      : now - createdAt;
    const target = policy.resolutionMinutes * 60_000;
    slaConsumedPercent = Math.min(100, Math.round((elapsed / target) * 100));
  }

  return {
    ticketId,
    ticketNumber:  ticket.ticketNumber,
    currentStatus: ticket.status,
    priority:      ticket.priority,

    metrics: {
      timeToFirstResponseSeconds,
      timeToResolutionSeconds,
      ageSeconds,
      slaBreached:           ticket.slaBreached,
      firstResponseBreached: ticket.firstResponseBreached,
      slaConsumedPercent,
    },

    slaTargets,
    history,
  };
}

// ─── 4. Aggregate SLA report ─────────────────────────────────────────────────
async function getSlaReport(filters = {}) {
  const { dateFrom, dateTo, priority, categoryId } = filters;

  const where = {
    ...(priority   ? { priority }   : {}),
    ...(categoryId ? { categoryId: parseInt(categoryId, 10) } : {}),
    ...(dateFrom || dateTo ? {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
      },
    } : {}),
  };

  const tickets = await prisma.ticket.findMany({
    where,
    select: {
      id: true, priority: true, status: true,
      createdAt: true, firstResponseAt: true,
      resolvedAt: true, closedAt: true,
      slaBreached: true, firstResponseBreached: true,
    },
  });

  const total   = tickets.length;
  const breached = tickets.filter(t => t.slaBreached).length;
  const firstRespBreached = tickets.filter(t => t.firstResponseBreached).length;

  // Resolution times for resolved/closed tickets only
  const resolved = tickets.filter(t => t.resolvedAt || t.closedAt);
  const resolutionTimes = resolved.map(t => {
    const rt = new Date(t.resolvedAt || t.closedAt);
    return Math.round((rt - new Date(t.createdAt)) / 1000);
  });
  const avgResolutionSeconds = resolutionTimes.length
    ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
    : null;

  // First response times
  const firstRespTimes = tickets
    .filter(t => t.firstResponseAt)
    .map(t => Math.round((new Date(t.firstResponseAt) - new Date(t.createdAt)) / 1000));
  const avgFirstResponseSeconds = firstRespTimes.length
    ? Math.round(firstRespTimes.reduce((a, b) => a + b, 0) / firstRespTimes.length)
    : null;

  // Per-priority breakdown
  const priorities = ['CRITICAL','HIGH','MEDIUM','LOW'];
  const byPriority = priorities.map(p => {
    const grp        = tickets.filter(t => t.priority === p);
    const grpRes     = grp.filter(t => t.resolvedAt || t.closedAt);
    const grpResTimes = grpRes.map(t => Math.round((new Date(t.resolvedAt || t.closedAt) - new Date(t.createdAt)) / 1000));
    return {
      priority: p,
      total:    grp.length,
      breached: grp.filter(t => t.slaBreached).length,
      resolved: grpRes.length,
      avgResolutionSeconds: grpResTimes.length
        ? Math.round(grpResTimes.reduce((a,b)=>a+b,0)/grpResTimes.length)
        : null,
    };
  }).filter(g => g.total > 0);

  return {
    summary: {
      total,
      breached,
      breachRate:        total > 0 ? Math.round((breached / total) * 100) : 0,
      firstRespBreached,
      resolved:          resolved.length,
      avgResolutionSeconds,
      avgFirstResponseSeconds,
    },
    byPriority,
  };
}

module.exports = { recordTransition, checkAndUpdateSla, getTicketTimeline, getSlaReport };
