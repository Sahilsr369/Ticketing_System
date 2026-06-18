/**
 * Import Service — Phase 8
 * Validates and bulk-inserts tickets from CSV or XLSX data.
 *
 * Template fields accepted (case-insensitive, trimmed):
 *   Ticket Number, Title, Description, Category, Subcategory,
 *   Priority, Status, Created Date
 *
 * Returns: { imported, skipped, errors[] }
 */
const prisma  = require('../utils/prisma');
const logger  = require('../utils/logger');
const { generateTicketNumber } = require('../utils/ticketNumber');
const { EVENT, logEvent }      = require('./activity.service');

const VALID_STATUSES   = new Set(['LOGGED','OPEN','PENDING','RESOLVED','CLOSED']);
const VALID_PRIORITIES = new Set(['LOW','MEDIUM','HIGH','CRITICAL']);

// Normalise a header string → canonical field name
function normaliseHeader(h) {
  return (h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const HEADER_MAP = {
  ticketnumber:  'ticketNumber',
  title:         'title',
  description:   'description',
  category:      'category',
  subcategory:   'subcategory',
  priority:      'priority',
  status:        'status',
  createddate:   'createdAt',
  created:       'createdAt',
  createdat:     'createdAt',
};

// Map raw row object (with any header casing) to canonical fields
function mapRow(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const canonical = HEADER_MAP[normaliseHeader(k)];
    if (canonical) out[canonical] = (v ?? '').toString().trim();
  }
  return out;
}

// Validate a single mapped row — returns array of error strings
function validateRow(row, i) {
  const errs = [];
  if (!row.title)       errs.push(`Row ${i}: title is required`);
  if (!row.description) errs.push(`Row ${i}: description is required`);
  if (row.priority && !VALID_PRIORITIES.has(row.priority.toUpperCase())) {
    errs.push(`Row ${i}: invalid priority "${row.priority}" — must be LOW/MEDIUM/HIGH/CRITICAL`);
  }
  if (row.status && !VALID_STATUSES.has(row.status.toUpperCase())) {
    errs.push(`Row ${i}: invalid status "${row.status}" — must be LOGGED/OPEN/PENDING/RESOLVED/CLOSED`);
  }
  if (row.createdAt && isNaN(new Date(row.createdAt).getTime())) {
    errs.push(`Row ${i}: invalid created date "${row.createdAt}"`);
  }
  return errs;
}

async function buildCategoryCache() {
  const cats = await prisma.category.findMany({
    where:  { active: true },
    select: { id: true, name: true, slug: true, subcategories: { select: { id: true, name: true } } },
  });
  // name → category, case-insensitive
  return new Map(cats.map(c => [c.name.toLowerCase(), c]));
}

/**
 * Import an array of row objects (already parsed from CSV/XLSX).
 * @param {object[]} rows     - raw row objects with any header casing
 * @param {object}   importer - the User performing the import
 * @returns {{ imported: number, skipped: number, errors: string[], results: object[] }}
 */
async function importTickets(rows, importer) {
  const catCache = await buildCategoryCache();
  const results  = [];
  let imported   = 0;
  let skipped    = 0;
  const errors   = [];

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapRow(rows[i]);
    const rowNum = i + 2; // 1-indexed + header row

    // Validate
    const rowErrors = validateRow(mapped, rowNum);
    if (rowErrors.length) {
      errors.push(...rowErrors);
      skipped++;
      results.push({ row: rowNum, status: 'error', errors: rowErrors });
      continue;
    }

    // Resolve category / subcategory by name
    let categoryId    = null;
    let subcategoryId = null;

    if (mapped.category) {
      const cat = catCache.get(mapped.category.toLowerCase());
      if (!cat) {
        const msg = `Row ${rowNum}: category "${mapped.category}" not found — skipped`;
        errors.push(msg);
        skipped++;
        results.push({ row: rowNum, status: 'error', errors: [msg] });
        continue;
      }
      categoryId = cat.id;

      if (mapped.subcategory) {
        const sub = cat.subcategories.find(s => s.name.toLowerCase() === mapped.subcategory.toLowerCase());
        if (sub) subcategoryId = sub.id;
        // subcategory not found — import anyway without subcategory
      }
    }

    // Check if ticketNumber already exists (skip duplicates)
    if (mapped.ticketNumber) {
      const existing = await prisma.ticket.findUnique({ where: { ticketNumber: mapped.ticketNumber } });
      if (existing) {
        const msg = `Row ${rowNum}: ticket number "${mapped.ticketNumber}" already exists — skipped`;
        errors.push(msg);
        skipped++;
        results.push({ row: rowNum, status: 'skipped', reason: 'duplicate ticket number' });
        continue;
      }
    }

    try {
      const ticketNumber = mapped.ticketNumber || await generateTicketNumber();
      const status       = mapped.status   ? mapped.status.toUpperCase()   : 'LOGGED';
      const priority     = mapped.priority ? mapped.priority.toUpperCase() : 'MEDIUM';

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          title:         mapped.title,
          description:   mapped.description,
          status,
          priority,
          categoryId,
          subcategoryId,
          submittedById: importer.id,
          createdAt:     mapped.createdAt ? new Date(mapped.createdAt) : undefined,
        },
        select: { id: true, ticketNumber: true, title: true, status: true, priority: true },
      });

      await logEvent({
        ticketId:  ticket.id,
        userId:    importer.id,
        eventType: EVENT.TICKET_CREATED,
        detail:    `Ticket ${ticket.ticketNumber} imported from file by ${importer.firstName} ${importer.lastName}`,
        metadata:  { imported: true, row: rowNum },
      });

      imported++;
      results.push({ row: rowNum, status: 'imported', ticketNumber: ticket.ticketNumber });
    } catch (err) {
      const msg = `Row ${rowNum}: failed to create — ${err.message}`;
      errors.push(msg);
      skipped++;
      results.push({ row: rowNum, status: 'error', errors: [msg] });
      logger.error(msg);
    }
  }

  logger.info(`Import complete: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);
  return { imported, skipped, errors, results };
}

module.exports = { importTickets };
