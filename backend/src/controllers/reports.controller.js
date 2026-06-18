const { ok, badRequest } = require('../utils/response');
const reportsService = require('../services/reports.service');

function parseFilters(query) {
  return {
    dateFrom:    query.dateFrom    || null,
    dateTo:      query.dateTo      || null,
    granularity: query.granularity || 'daily',
    status:      query.status      || null,
    priority:    query.priority    || null,
    categoryId:  query.categoryId  || null,
    format:      query.format      || 'json',
  };
}

async function volumes(req, res, next) {
  try {
    const f = parseFilters(req.query);
    const data = await reportsService.getVolumeReport(f);
    return ok(res, data);
  } catch (err) { next(err); }
}

async function status(req, res, next) {
  try {
    const f = parseFilters(req.query);
    const data = await reportsService.getStatusReport(f);
    return ok(res, data);
  } catch (err) { next(err); }
}

async function categories(req, res, next) {
  try {
    const f = parseFilters(req.query);
    const data = await reportsService.getCategoryReport(f);
    return ok(res, data);
  } catch (err) { next(err); }
}

async function performance(req, res, next) {
  try {
    const f = parseFilters(req.query);
    const data = await reportsService.getPerformanceReport(f);
    return ok(res, data);
  } catch (err) { next(err); }
}

async function exportData(req, res, next) {
  try {
    const f      = parseFilters(req.query);
    const rows   = await reportsService.getExportData(f);
    const format = (f.format || 'json').toLowerCase();

    if (format === 'csv') {
      if (!rows.length) return res.status(200).send('');
      const headers = Object.keys(rows[0]);
      const csvRows = [
        headers.join(','),
        ...rows.map(r => headers.map(h => {
          const v = String(r[h] ?? '').replace(/"/g, '""');
          return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v;
        }).join(',')),
      ];
      res.setHeader('Content-Type',        'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tickets-${Date.now()}.csv"`);
      return res.send(csvRows.join('\n'));
    }

    if (format === 'excel') {
      const XLSX = require('xlsx');
      const ws   = XLSX.utils.json_to_sheet(rows);
      const wb   = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tickets');

      // Auto-size columns
      const colWidths = Object.keys(rows[0] || {}).map(k => ({
        wch: Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length)) + 2,
      }));
      ws['!cols'] = colWidths;

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="tickets-${Date.now()}.xlsx"`);
      return res.send(buf);
    }

    // Default: JSON
    return ok(res, rows);
  } catch (err) { next(err); }
}

// Legacy SLA endpoint (Phase 4) — keep for backward compat
async function sla(req, res, next) {
  try {
    const { getSlaReport } = require('../services/sla.service');
    const data = await getSlaReport(req.query);
    return ok(res, data);
  } catch (err) { next(err); }
}

module.exports = { volumes, status, categories, performance, exportData, sla };
