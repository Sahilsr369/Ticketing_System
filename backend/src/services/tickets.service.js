const prisma  = require('../utils/prisma');
const logger  = require('../utils/logger');
const { generateTicketNumber }           = require('../utils/ticketNumber');
const { validateSubcategory }            = require('./categories.service');
const { recordTransition, checkAndUpdateSla } = require('./sla.service');
const { EVENT, logEvent }                = require('./activity.service');

// ─── Shared select shape ──────────────────────────────────────────────────────
const TICKET_SELECT = {
  id: true, ticketNumber: true, title: true, description: true,
  status: true, priority: true,
  category:    { select: { id: true, name: true, slug: true } },
  subcategory: { select: { id: true, name: true, slug: true } },
  department: true, floor: true, usersAffected: true,
  incidentTime: true, firstResponseAt: true,
  resolvedAt: true, closedAt: true, dueAt: true,
  slaBreached: true, firstResponseBreached: true,
  createdAt: true, updatedAt: true,
  submittedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  assignedTo:  { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  _count: { select: { comments: true, attachments: true } },
};

const COMMENT_SELECT = {
  id: true, body: true, internal: true, createdAt: true, updatedAt: true,
  author: { select: { id: true, firstName: true, lastName: true, role: true } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function assertValidCategory(categoryId, subcategoryId) {
  if (!categoryId) return;
  const cat = await prisma.category.findUnique({ where: { id: categoryId, active: true } });
  if (!cat) throw Object.assign(new Error(`Category ${categoryId} not found`), { status: 400 });
  if (subcategoryId) {
    const valid = await validateSubcategory(categoryId, subcategoryId);
    if (!valid) throw Object.assign(
      new Error(`Subcategory ${subcategoryId} does not belong to category ${categoryId}`),
      { status: 400 }
    );
  }
}

function buildVisibilityWhere(user) {
  switch (user.role) {
    case 'SUPER_ADMIN': case 'IT_MANAGER': case 'REPORTING_USER': case 'IT_TECHNICIAN': return {};
    default: return { submittedById: user.id };
  }
}

function canSeeInternal(user) {
  return ['SUPER_ADMIN','IT_MANAGER','IT_TECHNICIAN'].includes(user.role);
}

function assertCanEdit(ticket, user) {
  if (['SUPER_ADMIN','IT_MANAGER','IT_TECHNICIAN'].includes(user.role)) return;
  if (ticket.submittedById !== user.id) throw Object.assign(new Error('Access denied'), { status: 403 });
}

// ─── List / search tickets ────────────────────────────────────────────────────
async function listTickets(filters = {}, requestingUser) {
  const {
    page = 1, pageSize = 25,
    search, status, priority, categoryId, subcategoryId,
    assignedToId, submittedById,
    department, dateFrom, dateTo,
    slaBreached,
    sortBy = 'createdAt', sortDir = 'desc',
  } = filters;

  const skip     = (Math.max(1, page) - 1) * Math.min(100, pageSize);
  const visWhere = buildVisibilityWhere(requestingUser);

  const where = {
    ...visWhere,
    ...(search ? { OR: [
      { ticketNumber: { contains: search.trim(), mode: 'insensitive' } },
      { title:        { contains: search.trim(), mode: 'insensitive' } },
      { description:  { contains: search.trim(), mode: 'insensitive' } },
      { department:   { contains: search.trim(), mode: 'insensitive' } },
    ]} : {}),
    ...(status        ? { status }        : {}),
    ...(priority      ? { priority }      : {}),
    ...(categoryId    ? { categoryId }    : {}),
    ...(subcategoryId ? { subcategoryId } : {}),
    ...(assignedToId  ? { assignedToId }  : {}),
    ...(submittedById ? { submittedById } : {}),
    ...(slaBreached === 'true' ? { slaBreached: true } : {}),
    ...(department ? { department: { contains: department.trim(), mode: 'insensitive' } } : {}),
    ...(dateFrom || dateTo ? { createdAt: {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
    }} : {}),
  };

  const allowedSort = ['createdAt','updatedAt','priority','status','ticketNumber'];
  const orderField  = allowedSort.includes(sortBy) ? sortBy : 'createdAt';

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where, skip, take: Math.min(100, pageSize),
      orderBy: { [orderField]: sortDir === 'asc' ? 'asc' : 'desc' },
      select: TICKET_SELECT,
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    tickets, total,
    page: Math.max(1, page),
    pageSize: Math.min(100, pageSize),
    totalPages: Math.ceil(total / Math.min(100, pageSize)),
  };
}

// ─── Get single ticket with comments ─────────────────────────────────────────
async function getTicketById(id, requestingUser) {
  const ticket = await prisma.ticket.findUnique({
    where:  { id },
    select: {
      ...TICKET_SELECT,
      comments: {
        where:   canSeeInternal(requestingUser) ? {} : { internal: false },
        orderBy: { createdAt: 'asc' },
        select:  COMMENT_SELECT,
      },
    },
  });

  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  const vis = buildVisibilityWhere(requestingUser);
  if (vis.submittedById && ticket.submittedBy.id !== requestingUser.id) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }

  return ticket;
}

// ─── Create ticket ────────────────────────────────────────────────────────────
async function createTicket(data, requestingUser) {
  const categoryId    = data.categoryId    ? parseInt(data.categoryId, 10)    : null;
  const subcategoryId = data.subcategoryId ? parseInt(data.subcategoryId, 10) : null;
  await assertValidCategory(categoryId, subcategoryId);

  const ticketNumber  = await generateTicketNumber();
  const initialStatus = data.status || 'LOGGED';

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      title:         data.title.trim(),
      description:   data.description.trim(),
      status:        initialStatus,
      priority:      data.priority     || 'MEDIUM',
      categoryId,
      subcategoryId,
      department:    data.department   ? data.department.trim()   : null,
      floor:         data.floor        ? data.floor.trim()        : null,
      usersAffected: data.usersAffected != null ? parseInt(data.usersAffected, 10) : 1,
      incidentTime:  data.incidentTime ? new Date(data.incidentTime) : null,
      dueAt:         data.dueAt        ? new Date(data.dueAt)        : null,
      submittedById: requestingUser.id,
      assignedToId:  data.assignedToId || null,
    },
    select: TICKET_SELECT,
  });

  // Activity feed — TICKET_CREATED
  await logEvent({
    ticketId:  ticket.id,
    userId:    requestingUser.id,
    eventType: EVENT.TICKET_CREATED,
    detail:    `Ticket ${ticket.ticketNumber} created by ${requestingUser.firstName} ${requestingUser.lastName}`,
    metadata:  { ticketNumber: ticket.ticketNumber, title: ticket.title, priority: ticket.priority },
  });

  // SLA history — initial state
  await recordTransition(ticket.id, null, initialStatus, requestingUser.id, `Ticket created`);

  // First assignment on creation
  if (data.assignedToId) {
    await logEvent({
      ticketId:  ticket.id,
      userId:    requestingUser.id,
      eventType: EVENT.TICKET_ASSIGNED,
      detail:    `Assigned on creation`,
      metadata:  { assignedToId: data.assignedToId },
    });
    await prisma.ticket.update({ where: { id: ticket.id }, data: { firstResponseAt: new Date() } });
  }

  await checkAndUpdateSla(ticket.id);
  logger.info(`Ticket created: ${ticket.ticketNumber} by ${requestingUser.email}`);
  return ticket;
}

// ─── Update ticket ────────────────────────────────────────────────────────────
async function updateTicket(id, data, requestingUser) {
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Ticket not found'), { status: 404 });
  assertCanEdit(existing, requestingUser);

  const updateData = {};
  const changes    = [];

  const setIfChanged = (field, newVal, transform = v => v) => {
    const cleaned = newVal !== undefined ? transform(newVal) : undefined;
    if (cleaned !== undefined && cleaned !== existing[field]) {
      updateData[field] = cleaned;
      changes.push(field);
    }
  };

  setIfChanged('title',         data.title,         v => v.trim());
  setIfChanged('description',   data.description,   v => v.trim());
  setIfChanged('priority',      data.priority);
  setIfChanged('department',    data.department,    v => v ? v.trim() : null);
  setIfChanged('floor',         data.floor,         v => v ? v.trim() : null);
  setIfChanged('usersAffected', data.usersAffected, v => parseInt(v, 10));
  setIfChanged('assignedToId',  data.assignedToId,  v => v || null);
  setIfChanged('dueAt',         data.dueAt,         v => v ? new Date(v) : null);
  setIfChanged('incidentTime',  data.incidentTime,  v => v ? new Date(v) : null);

  // Category pair
  const incomingCatId = data.categoryId    !== undefined ? (data.categoryId    ? parseInt(data.categoryId, 10)    : null) : undefined;
  const incomingSubId = data.subcategoryId !== undefined ? (data.subcategoryId ? parseInt(data.subcategoryId, 10) : null) : undefined;
  const resolvedCatId = incomingCatId !== undefined ? incomingCatId : existing.categoryId;
  const resolvedSubId = incomingSubId !== undefined ? incomingSubId : existing.subcategoryId;
  if (incomingCatId !== undefined || incomingSubId !== undefined) {
    await assertValidCategory(resolvedCatId, resolvedSubId);
  }
  if (incomingCatId !== undefined && incomingCatId !== existing.categoryId) {
    updateData.categoryId = incomingCatId; changes.push('categoryId');
    if (incomingSubId === undefined) { updateData.subcategoryId = null; changes.push('subcategoryId'); }
  }
  if (incomingSubId !== undefined && incomingSubId !== existing.subcategoryId) {
    updateData.subcategoryId = incomingSubId;
    if (!changes.includes('subcategoryId')) changes.push('subcategoryId');
  }

  // Status change
  const newStatus = data.status;
  if (newStatus && newStatus !== existing.status) {
    updateData.status = newStatus;
    changes.push('status');
    if (newStatus === 'RESOLVED' && !existing.resolvedAt) updateData.resolvedAt = new Date();
    if (newStatus === 'CLOSED'   && !existing.closedAt)   updateData.closedAt   = new Date();

    await recordTransition(id, existing.status, newStatus, requestingUser.id,
      `Status changed from ${existing.status} to ${newStatus}`, existing.updatedAt
    );
    await logEvent({
      ticketId:  id,
      userId:    requestingUser.id,
      eventType: newStatus === 'CLOSED' ? EVENT.TICKET_CLOSED
               : newStatus === 'LOGGED' || newStatus === 'OPEN' ? EVENT.TICKET_REOPENED
               : EVENT.STATUS_CHANGED,
      detail:    `Status changed from ${existing.status} to ${newStatus}`,
      metadata:  { previousStatus: existing.status, newStatus },
    });
  }

  // Priority change event
  if (data.priority && data.priority !== existing.priority) {
    await logEvent({
      ticketId:  id,
      userId:    requestingUser.id,
      eventType: EVENT.PRIORITY_CHANGED,
      detail:    `Priority changed from ${existing.priority} to ${data.priority}`,
      metadata:  { previousPriority: existing.priority, newPriority: data.priority },
    });
  }

  // First response on first assignment
  if (updateData.assignedToId && !existing.firstResponseAt) {
    updateData.firstResponseAt = new Date();
  }

  // Assignment change event
  if ('assignedToId' in updateData) {
    await logEvent({
      ticketId:  id,
      userId:    requestingUser.id,
      eventType: updateData.assignedToId ? EVENT.TICKET_ASSIGNED : EVENT.TICKET_UNASSIGNED,
      detail:    updateData.assignedToId ? `Ticket assigned` : `Ticket unassigned`,
      metadata:  { assignedToId: updateData.assignedToId },
    });
  }

  // Generic field update event
  const fieldChanges = changes.filter(c => !['status','priority','assignedToId'].includes(c));
  if (fieldChanges.length) {
    await logEvent({
      ticketId:  id,
      userId:    requestingUser.id,
      eventType: EVENT.FIELD_UPDATED,
      detail:    `Updated: ${fieldChanges.join(', ')}`,
      metadata:  { fields: fieldChanges },
    });
  }

  const ticket = await prisma.ticket.update({ where: { id }, data: updateData, select: TICKET_SELECT });

  if (changes.length) await checkAndUpdateSla(ticket.id);

  logger.info(`Ticket updated: ${ticket.ticketNumber} — ${changes.join(', ')} by ${requestingUser.email}`);
  return ticket;
}

// ─── Assign ticket ────────────────────────────────────────────────────────────
async function assignTicket(id, assignedToId, requestingUser) {
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  if (assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignee || !assignee.active) throw Object.assign(new Error('Assignee not found or inactive'), { status: 400 });
    if (!['SUPER_ADMIN','IT_MANAGER','IT_TECHNICIAN'].includes(assignee.role)) {
      throw Object.assign(new Error('User cannot be assigned tickets — must be IT staff'), { status: 400 });
    }
  }

  const prevStatus  = existing.status;
  const newStatus   = prevStatus === 'LOGGED' ? 'OPEN' : prevStatus;
  const statusChanged = newStatus !== prevStatus;

  const updateData = { assignedToId: assignedToId || null, status: newStatus };
  if (assignedToId && !existing.firstResponseAt) updateData.firstResponseAt = new Date();
  if (statusChanged && newStatus === 'RESOLVED' && !existing.resolvedAt) updateData.resolvedAt = new Date();
  if (statusChanged && newStatus === 'CLOSED'   && !existing.closedAt)   updateData.closedAt   = new Date();

  const ticket = await prisma.ticket.update({ where: { id }, data: updateData, select: TICKET_SELECT });

  if (statusChanged) {
    await recordTransition(id, prevStatus, newStatus, requestingUser.id,
      `Status moved to ${newStatus} on assignment`, existing.updatedAt
    );
  }

  await logEvent({
    ticketId:  id,
    userId:    requestingUser.id,
    eventType: assignedToId ? EVENT.TICKET_ASSIGNED : EVENT.TICKET_UNASSIGNED,
    detail: assignedToId
      ? `Assigned to ${ticket.assignedTo?.firstName} ${ticket.assignedTo?.lastName}`
      : 'Ticket unassigned',
    metadata: { assignedToId: assignedToId || null },
  });

  await checkAndUpdateSla(ticket.id);
  logger.info(`Ticket ${ticket.ticketNumber} assigned by ${requestingUser.email}`);
  return ticket;
}

// ─── Change status ────────────────────────────────────────────────────────────
async function changeStatus(id, status, requestingUser) {
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Ticket not found'), { status: 404 });
  assertCanEdit(existing, requestingUser);

  const updateData = { status };
  if (status === 'RESOLVED' && !existing.resolvedAt) updateData.resolvedAt = new Date();
  if (status === 'CLOSED'   && !existing.closedAt)   updateData.closedAt   = new Date();

  const ticket = await prisma.ticket.update({ where: { id }, data: updateData, select: TICKET_SELECT });

  await recordTransition(id, existing.status, status, requestingUser.id,
    `Status changed from ${existing.status} to ${status}`, existing.updatedAt
  );

  await logEvent({
    ticketId:  id,
    userId:    requestingUser.id,
    eventType: status === 'CLOSED' ? EVENT.TICKET_CLOSED
             : (status === 'LOGGED' || status === 'OPEN') && ['RESOLVED','CLOSED'].includes(existing.status)
               ? EVENT.TICKET_REOPENED
               : EVENT.STATUS_CHANGED,
    detail:    `Status changed from ${existing.status} to ${status}`,
    metadata:  { previousStatus: existing.status, newStatus: status },
  });

  await checkAndUpdateSla(ticket.id);
  return ticket;
}

// ─── Delete ticket ────────────────────────────────────────────────────────────
async function deleteTicket(id, requestingUser) {
  const existing = await prisma.ticket.findUnique({
    where:  { id },
    select: { id: true, ticketNumber: true, submittedById: true },
  });
  if (!existing) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  const isStaff = ['SUPER_ADMIN','IT_MANAGER'].includes(requestingUser.role);
  if (!isStaff && existing.submittedById !== requestingUser.id) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }

  await prisma.ticket.delete({ where: { id } });
  logger.info(`Ticket deleted: ${existing.ticketNumber} by ${requestingUser.email}`);
  return { ticketNumber: existing.ticketNumber };
}

// ─── Add comment ──────────────────────────────────────────────────────────────
async function addComment(ticketId, body, internal, requestingUser) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  const isInternal = internal && canSeeInternal(requestingUser);

  const comment = await prisma.comment.create({
    data:   { ticketId, body: body.trim(), internal: isInternal, authorId: requestingUser.id },
    select: COMMENT_SELECT,
  });

  // Log comment as typed activity event
  await logEvent({
    ticketId,
    userId:     requestingUser.id,
    eventType:  isInternal ? EVENT.INTERNAL_NOTE : EVENT.COMMENT_ADDED,
    detail:     body.trim(),
    isInternal,
    metadata:   { commentId: comment.id },
  });

  return comment;
}

// ─── Dashboard summary ────────────────────────────────────────────────────────
async function getDashboardSummary(requestingUser) {
  const visWhere = buildVisibilityWhere(requestingUser);

  const [
    totalOpen, totalLogged, totalPending, totalResolved, totalClosed,
    criticalOpen, highOpen,
    byCategory, recentTickets, unassigned,
    slaBreachedCount, myTickets,
  ] = await Promise.all([
    prisma.ticket.count({ where: { ...visWhere, status: 'OPEN'    } }),
    prisma.ticket.count({ where: { ...visWhere, status: 'LOGGED'  } }),
    prisma.ticket.count({ where: { ...visWhere, status: 'PENDING' } }),
    prisma.ticket.count({ where: { ...visWhere, status: 'RESOLVED'} }),
    prisma.ticket.count({ where: { ...visWhere, status: 'CLOSED'  } }),
    prisma.ticket.count({ where: { ...visWhere, status: { in: ['OPEN','LOGGED','PENDING'] }, priority: 'CRITICAL' } }),
    prisma.ticket.count({ where: { ...visWhere, status: { in: ['OPEN','LOGGED','PENDING'] }, priority: 'HIGH'     } }),
    prisma.ticket.groupBy({ by: ['categoryId'], where: visWhere, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.ticket.findMany({ where: visWhere, orderBy: { createdAt: 'desc' }, take: 8, select: TICKET_SELECT }),
    prisma.ticket.count({ where: { ...visWhere, assignedToId: null, status: { in: ['OPEN','LOGGED','PENDING'] } } }),
    prisma.ticket.count({ where: { ...visWhere, slaBreached: true, status: { in: ['OPEN','LOGGED','PENDING'] } } }),
    requestingUser.role === 'IT_TECHNICIAN'
      ? prisma.ticket.count({ where: { assignedToId: requestingUser.id, status: { in: ['OPEN','LOGGED','PENDING'] } } })
      : Promise.resolve(null),
  ]);

  const categoryIds = byCategory.map(r => r.categoryId).filter(Boolean);
  const categories  = categoryIds.length
    ? await prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
    : [];
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  return {
    counts: {
      logged: totalLogged, open: totalOpen, pending: totalPending,
      resolved: totalResolved, closed: totalClosed,
      total:  totalLogged + totalOpen + totalPending + totalResolved + totalClosed,
      active: totalLogged + totalOpen + totalPending,
    },
    alerts: { critical: criticalOpen, high: highOpen, unassigned, slaBreached: slaBreachedCount },
    byCategory: byCategory.map(r => ({
      categoryId:   r.categoryId,
      categoryName: r.categoryId ? (catMap[r.categoryId] ?? 'Unknown') : 'Uncategorised',
      count:        r._count.id,
    })),
    recentTickets,
    ...(myTickets !== null ? { myAssigned: myTickets } : {}),
  };
}

module.exports = {
  listTickets, getTicketById, createTicket, updateTicket,
  assignTicket, changeStatus, deleteTicket,
  addComment, getDashboardSummary,
};
