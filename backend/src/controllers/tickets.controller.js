const { body, param, query } = require('express-validator');
const { validate }    = require('../middleware/validate');
const ticketsService  = require('../services/tickets.service');
const { ok, created, badRequest, notFound, forbidden } = require('../utils/response');

const VALID_STATUSES   = ['LOGGED','OPEN','PENDING','RESOLVED','CLOSED'];
const VALID_PRIORITIES = ['LOW','MEDIUM','HIGH','CRITICAL'];
const VALID_SORT       = ['createdAt','updatedAt','priority','status','ticketNumber'];

// ─── Validation chains ────────────────────────────────────────────────────────

const createValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }).withMessage('Max 255 chars'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('categoryId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('categoryId must be a positive integer'),
  body('subcategoryId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('subcategoryId must be a positive integer'),
  body('priority').optional().isIn(VALID_PRIORITIES).withMessage('Invalid priority'),
  body('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status'),
  body('department').optional().trim(),
  body('floor').optional().trim(),
  body('usersAffected').optional().isInt({ min: 1 }).withMessage('Users affected must be a positive integer'),
  body('incidentTime').optional().isISO8601().withMessage('incidentTime must be a valid ISO date'),
  body('dueAt').optional().isISO8601().withMessage('dueAt must be a valid ISO date'),
  body('assignedToId').optional({ nullable: true }).isUUID().withMessage('assignedToId must be a UUID'),
  validate,
];

const updateValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 255 }),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('categoryId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('categoryId must be a positive integer'),
  body('subcategoryId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('subcategoryId must be a positive integer'),
  body('priority').optional().isIn(VALID_PRIORITIES).withMessage('Invalid priority'),
  body('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status'),
  body('department').optional({ nullable: true }).trim(),
  body('floor').optional({ nullable: true }).trim(),
  body('usersAffected').optional().isInt({ min: 1 }).withMessage('Must be a positive integer'),
  body('incidentTime').optional({ nullable: true }).isISO8601().withMessage('Must be a valid ISO date'),
  body('dueAt').optional({ nullable: true }).isISO8601().withMessage('Must be a valid ISO date'),
  body('assignedToId').optional({ nullable: true }).isUUID().withMessage('Must be a UUID'),
  validate,
];

const statusValidation = [
  body('status').isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  validate,
];

const assignValidation = [
  body('assignedToId').optional({ nullable: true }).isUUID().withMessage('Must be a valid UUID'),
  validate,
];

const commentValidation = [
  body('body').trim().notEmpty().withMessage('Comment body is required'),
  body('internal').optional().isBoolean(),
  validate,
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function list(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page, 10)     || 1);
    const pageSize = Math.min(100, parseInt(req.query.pageSize, 10) || 25);
    const sortBy   = VALID_SORT.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortDir  = req.query.sortDir === 'asc' ? 'asc' : 'desc';

    const filters = {
      page, pageSize, sortBy, sortDir,
      search:        (req.query.search        || '').trim() || undefined,
      status:        req.query.status         || undefined,
      priority:      req.query.priority       || undefined,
      categoryId:    req.query.categoryId     ? parseInt(req.query.categoryId, 10)    : undefined,
      subcategoryId: req.query.subcategoryId  ? parseInt(req.query.subcategoryId, 10) : undefined,
      assignedToId:  req.query.assignedToId   || undefined,
      submittedById: req.query.submittedById  || undefined,
      department:    req.query.department     || undefined,
      dateFrom:      req.query.dateFrom       || undefined,
      dateTo:        req.query.dateTo         || undefined,
    };

    const result = await ticketsService.listTickets(filters, req.user);
    return ok(res, result);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const ticket = await ticketsService.getTicketById(req.params.id, req.user);
    return ok(res, ticket);
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    if (err.status === 403) return forbidden(res, err.message);
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const ticket = await ticketsService.createTicket(req.body, req.user);
    return created(res, ticket, `Ticket ${ticket.ticketNumber} created`);
  } catch (err) {
    if (err.status === 400) return badRequest(res, err.message);
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const ticket = await ticketsService.updateTicket(req.params.id, req.body, req.user);
    return ok(res, ticket, 'Ticket updated');
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    if (err.status === 403) return forbidden(res, err.message);
    if (err.status === 400) return badRequest(res, err.message);
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const ticket = await ticketsService.assignTicket(req.params.id, req.body.assignedToId || null, req.user);
    return ok(res, ticket, 'Ticket assigned');
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    if (err.status === 400) return badRequest(res, err.message);
    next(err);
  }
}

async function setStatus(req, res, next) {
  try {
    const ticket = await ticketsService.changeStatus(req.params.id, req.body.status, req.user);
    return ok(res, ticket, 'Status updated');
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    if (err.status === 403) return forbidden(res, err.message);
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await ticketsService.deleteTicket(req.params.id, req.user);
    return ok(res, result, `Ticket ${result.ticketNumber} deleted`);
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    if (err.status === 403) return forbidden(res, err.message);
    next(err);
  }
}

async function addComment(req, res, next) {
  try {
    const { body: commentBody, internal = false } = req.body;
    const comment = await ticketsService.addComment(req.params.id, commentBody, internal, req.user);
    return created(res, comment, 'Comment added');
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    next(err);
  }
}

async function dashboard(req, res, next) {
  try {
    const summary = await ticketsService.getDashboardSummary(req.user);
    return ok(res, summary);
  } catch (err) { next(err); }
}

module.exports = {
  createValidation, create,
  updateValidation, update,
  statusValidation, setStatus,
  assignValidation, assign,
  commentValidation, addComment,
  list, getOne, remove, dashboard,
};
