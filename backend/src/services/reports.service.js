/**
 * Reports Service — Phase 7
 * All management reporting queries. Returns structured data ready for
 * Chart.js rendering and CSV/Excel export.
 */
const prisma = require('../utils/prisma');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildDateWhere(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return {};
  return {
    createdAt: {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
    },
  };
}

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Volume report — daily / weekly / monthly counts ─────────────────────────
async function getVolumeReport({ dateFrom, dateTo, granularity = 'daily' } = {}) {
  // Default to last 30 days if no range given
  const to   = dateTo   ? new Date(dateTo)   : new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);

  const tickets = await prisma.ticket.findMany({
    where:   { createdAt: { gte: from, lte: to } },
    select:  { id: true, createdAt: true, status: true, priority: true },
    orderBy: { createdAt: 'asc' },
  });

  // Build bucket map
  const buckets = new Map();

  const bucketKey = (date) => {
    const d = new Date(date);
    if (granularity === 'monthly') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    if (granularity === 'weekly') {
      // ISO week start (Monday)
      const day  = d.getDay() || 7;
      const mon  = new Date(d);
      mon.setDate(d.getDate() - day + 1);
      return mon.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10); // daily
  };

  // Pre-fill all buckets in range so Chart.js gets continuous x-axis
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = bucketKey(cursor);
    if (!buckets.has(key)) buckets.set(key, { label: key, total: 0, resolved: 0, closed: 0 });
    if (granularity === 'daily')   cursor.setDate(cursor.getDate() + 1);
    else if (granularity === 'weekly')  cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
  }

  // Fill counts
  for (const t of tickets) {
    const key = bucketKey(t.createdAt);
    const b   = buckets.get(key) || { label: key, total: 0, resolved: 0, closed: 0 };
    b.total++;
    if (t.status === 'RESOLVED') b.resolved++;
    if (t.status === 'CLOSED')   b.closed++;
    buckets.set(key, b);
  }

  return {
    granularity,
    dateFrom: from.toISOString(),
    dateTo:   to.toISOString(),
    total:    tickets.length,
    data:     Array.from(buckets.values()),
  };
}

// ─── Status report ────────────────────────────────────────────────────────────
async function getStatusReport({ dateFrom, dateTo } = {}) {
  const dateWhere = buildDateWhere(dateFrom, dateTo);

  const [counts, priorityCounts] = await Promise.all([
    prisma.ticket.groupBy({
      by:     ['status'],
      where:  dateWhere,
      _count: { id: true },
    }),
    prisma.ticket.groupBy({
      by:     ['status', 'priority'],
      where:  dateWhere,
      _count: { id: true },
    }),
  ]);

  const total = counts.reduce((s, r) => s + r._count.id, 0);

  const STATUS_ORDER = ['LOGGED','OPEN','PENDING','RESOLVED','CLOSED'];
  const byStatus = STATUS_ORDER.map(s => {
    const row = counts.find(r => r.status === s);
    const count = row?._count.id || 0;
    return {
      status: s,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  // Priority breakdown per status
  const byStatusAndPriority = STATUS_ORDER.map(s => ({
    status: s,
    priorities: ['CRITICAL','HIGH','MEDIUM','LOW'].map(p => ({
      priority: p,
      count: priorityCounts.find(r => r.status === s && r.priority === p)?._count.id || 0,
    })),
  }));

  return { total, byStatus, byStatusAndPriority };
}

// ─── Category report ──────────────────────────────────────────────────────────
async function getCategoryReport({ dateFrom, dateTo } = {}) {
  const dateWhere = buildDateWhere(dateFrom, dateTo);

  const [byCat, bySub] = await Promise.all([
    prisma.ticket.groupBy({
      by:     ['categoryId'],
      where:  { ...dateWhere, categoryId: { not: null } },
      _count: { id: true },
      orderBy:{ _count: { id: 'desc' } },
    }),
    prisma.ticket.groupBy({
      by:     ['subcategoryId', 'categoryId'],
      where:  { ...dateWhere, subcategoryId: { not: null } },
      _count: { id: true },
      orderBy:{ _count: { id: 'desc' } },
    }),
  ]);

  // Resolve names
  const catIds = [...new Set([
    ...byCat.map(r => r.categoryId),
    ...bySub.map(r => r.categoryId),
  ].filter(Boolean))];

  const subIds = bySub.map(r => r.subcategoryId).filter(Boolean);

  const [cats, subs] = await Promise.all([
    catIds.length ? prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true, slug: true } }) : [],
    subIds.length ? prisma.subcategory.findMany({ where: { id: { in: subIds } }, select: { id: true, name: true, categoryId: true } }) : [],
  ]);

  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
  const subMap = Object.fromEntries(subs.map(s => [s.id, s]));

  const total = byCat.reduce((s, r) => s + r._count.id, 0)
    + (await prisma.ticket.count({ where: { ...dateWhere, categoryId: null } }));

  const byCategory = byCat.map(r => ({
    categoryId:   r.categoryId,
    categoryName: catMap[r.categoryId]?.name || 'Unknown',
    count:        r._count.id,
    pct:          total > 0 ? Math.round((r._count.id / total) * 100) : 0,
    subcategories: bySub
      .filter(s => s.categoryId === r.categoryId)
      .map(s => ({
        subcategoryId:   s.subcategoryId,
        subcategoryName: subMap[s.subcategoryId]?.name || 'Unknown',
        count:           s._count.id,
      })),
  }));

  const uncategorised = await prisma.ticket.count({ where: { ...dateWhere, categoryId: null } });

  return { total, byCategory, uncategorised };
}

// ─── Performance report ───────────────────────────────────────────────────────
async function getPerformanceReport({ dateFrom, dateTo } = {}) {
  const dateWhere = buildDateWhere(dateFrom, dateTo);

  const tickets = await prisma.ticket.findMany({
    where:  dateWhere,
    select: {
      id: true, priority: true, status: true,
      createdAt: true, firstResponseAt: true,
      resolvedAt: true, closedAt: true,
      slaBreached: true, firstResponseBreached: true,
      assignedToId: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const total    = tickets.length;
  const resolved = tickets.filter(t => t.resolvedAt || t.closedAt);

  // ── Avg resolution time by priority ──
  const PRIORITIES = ['CRITICAL','HIGH','MEDIUM','LOW'];
  const byPriority = PRIORITIES.map(p => {
    const grp = resolved.filter(t => t.priority === p);
    const times = grp.map(t => {
      const end = new Date(t.resolvedAt || t.closedAt);
      return (end - new Date(t.createdAt)) / 1000;
    });
    const avg = times.length ? Math.round(times.reduce((a,b)=>a+b,0)/times.length) : null;
    return { priority: p, count: grp.length, avgResolutionSeconds: avg, avgResolutionFormatted: formatDuration(avg) };
  });

  // ── SLA compliance ──
  const slaBreached      = tickets.filter(t => t.slaBreached).length;
  const firstRespBreached= tickets.filter(t => t.firstResponseBreached).length;
  const slaCompliant     = total - slaBreached;
  const slaComplianceRate= total > 0 ? Math.round((slaCompliant / total) * 100) : 100;

  // ── Avg first response time ──
  const withFirstResp = tickets.filter(t => t.firstResponseAt);
  const avgFirstResponseSeconds = withFirstResp.length
    ? Math.round(withFirstResp.reduce((s,t) => s + (new Date(t.firstResponseAt) - new Date(t.createdAt))/1000, 0) / withFirstResp.length)
    : null;

  // ── Overall avg resolution time ──
  const allTimes = resolved.map(t => (new Date(t.resolvedAt||t.closedAt) - new Date(t.createdAt))/1000);
  const avgResolutionSeconds = allTimes.length
    ? Math.round(allTimes.reduce((a,b)=>a+b,0)/allTimes.length)
    : null;

  // ── Tickets per technician ──
  const techMap = new Map();
  for (const t of tickets) {
    if (!t.assignedToId || !t.assignedTo) continue;
    const id  = t.assignedToId;
    const rec = techMap.get(id) || {
      techId: id,
      name:   `${t.assignedTo.firstName} ${t.assignedTo.lastName}`,
      total: 0, resolved: 0, breached: 0,
      resolutionTimes: [],
    };
    rec.total++;
    if (t.resolvedAt || t.closedAt) {
      rec.resolved++;
      rec.resolutionTimes.push((new Date(t.resolvedAt||t.closedAt) - new Date(t.createdAt))/1000);
    }
    if (t.slaBreached) rec.breached++;
    techMap.set(id, rec);
  }

  const byTechnician = Array.from(techMap.values()).map(r => ({
    techId:               r.techId,
    name:                 r.name,
    total:                r.total,
    resolved:             r.resolved,
    breached:             r.breached,
    slaComplianceRate:    r.total > 0 ? Math.round(((r.total - r.breached) / r.total) * 100) : 100,
    avgResolutionSeconds: r.resolutionTimes.length
      ? Math.round(r.resolutionTimes.reduce((a,b)=>a+b,0)/r.resolutionTimes.length)
      : null,
    avgResolutionFormatted: formatDuration(
      r.resolutionTimes.length ? Math.round(r.resolutionTimes.reduce((a,b)=>a+b,0)/r.resolutionTimes.length) : null
    ),
  })).sort((a,b) => b.total - a.total);

  return {
    total, resolvedCount: resolved.length,
    sla: { total, slaBreached, firstRespBreached, slaCompliant, slaComplianceRate },
    avgFirstResponseSeconds,
    avgFirstResponseFormatted: formatDuration(avgFirstResponseSeconds),
    avgResolutionSeconds,
    avgResolutionFormatted: formatDuration(avgResolutionSeconds),
    byPriority,
    byTechnician,
  };
}

// ─── Export: raw ticket data as array for CSV/Excel ───────────────────────────
async function getExportData({ dateFrom, dateTo, status, priority, categoryId } = {}) {
  const where = {
    ...buildDateWhere(dateFrom, dateTo),
    ...(status     ? { status }     : {}),
    ...(priority   ? { priority }   : {}),
    ...(categoryId ? { categoryId: parseInt(categoryId, 10) } : {}),
  };

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      ticketNumber: true, title: true, status: true, priority: true,
      category:     { select: { name: true } },
      subcategory:  { select: { name: true } },
      department: true, floor: true, usersAffected: true,
      createdAt: true, firstResponseAt: true, resolvedAt: true, closedAt: true, dueAt: true,
      slaBreached: true, firstResponseBreached: true,
      submittedBy: { select: { firstName: true, lastName: true, email: true } },
      assignedTo:  { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { comments: true } },
    },
  });

  return tickets.map(t => ({
    'Ticket Number':   t.ticketNumber,
    'Title':           t.title,
    'Status':          t.status,
    'Priority':        t.priority,
    'Category':        t.category?.name    || '',
    'Subcategory':     t.subcategory?.name || '',
    'Department':      t.department        || '',
    'Floor':           t.floor             || '',
    'Users Affected':  t.usersAffected,
    'Submitted By':    `${t.submittedBy.firstName} ${t.submittedBy.lastName}`,
    'Submitted By Email': t.submittedBy.email,
    'Assigned To':     t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : '',
    'Assigned To Email': t.assignedTo?.email || '',
    'Created':         t.createdAt    ? new Date(t.createdAt).toISOString()    : '',
    'First Response':  t.firstResponseAt ? new Date(t.firstResponseAt).toISOString() : '',
    'Resolved':        t.resolvedAt   ? new Date(t.resolvedAt).toISOString()   : '',
    'Closed':          t.closedAt     ? new Date(t.closedAt).toISOString()     : '',
    'Due':             t.dueAt        ? new Date(t.dueAt).toISOString()        : '',
    'SLA Breached':    t.slaBreached  ? 'Yes' : 'No',
    'First Response Breached': t.firstResponseBreached ? 'Yes' : 'No',
    'Comments':        t._count.comments,
  }));
}

module.exports = { getVolumeReport, getStatusReport, getCategoryReport, getPerformanceReport, getExportData };
