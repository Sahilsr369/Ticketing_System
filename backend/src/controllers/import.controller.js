const multer = require('multer');
const XLSX   = require('xlsx');
const { importTickets } = require('../services/import.service');
const { ok, badRequest } = require('../utils/response');

// Store uploaded file in memory — never written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only CSV and XLSX files are accepted'), ok);
  },
});

// Parse CSV or XLSX buffer → array of row objects
function parseFile(buffer, mimetype, originalname) {
  const isCSV = /\.csv$/i.test(originalname);
  const wb    = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws    = wb.Sheets[wb.SheetNames[0]];
  // header: 1 = first row as keys, raw: false = format dates as strings
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    .filter((_, i) => i > 0) // skip header row — we'll use it as keys below
    .map(row => {
      // Re-parse with headers
      return null; // replaced below
    })
    .filter(Boolean);
}

// Better parse: use sheet_to_json with header:1 and manually map
function parseWorkbook(buffer, originalname) {
  const wb  = XLSX.read(buffer, { type: 'buffer', cellDates: true, dateNF: 'yyyy-mm-dd' });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return rows;
}

async function importFile(req, res, next) {
  try {
    if (!req.file) return badRequest(res, 'No file uploaded');

    let rows;
    try {
      rows = parseWorkbook(req.file.buffer, req.file.originalname);
    } catch (e) {
      return badRequest(res, `Could not parse file: ${e.message}`);
    }

    if (!rows.length) return badRequest(res, 'File is empty or has no data rows');
    if (rows.length > 5000) return badRequest(res, 'Maximum 5,000 rows per import');

    const result = await importTickets(rows, req.user);
    return ok(res, result, `Import complete: ${result.imported} imported, ${result.skipped} skipped`);
  } catch (err) { next(err); }
}

// Preview first 5 rows without inserting
async function previewFile(req, res, next) {
  try {
    if (!req.file) return badRequest(res, 'No file uploaded');

    let rows;
    try {
      rows = parseWorkbook(req.file.buffer, req.file.originalname);
    } catch (e) {
      return badRequest(res, `Could not parse file: ${e.message}`);
    }

    const preview  = rows.slice(0, 5);
    const headers  = rows.length ? Object.keys(rows[0]) : [];
    return ok(res, { totalRows: rows.length, headers, preview });
  } catch (err) { next(err); }
}

// Download import template
async function downloadTemplate(req, res, next) {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();

    const templateRows = [
      {
        'Ticket Number': '',
        'Title': 'Example: Laptop not connecting to Wi-Fi',
        'Description': 'Full description of the issue',
        'Category': 'Network & Connectivity',
        'Subcategory': 'Wi-Fi Issue',
        'Priority': 'MEDIUM',
        'Status': 'LOGGED',
        'Created Date': new Date().toISOString().slice(0, 10),
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateRows);

    // Column widths
    ws['!cols'] = [
      { wch: 16 }, { wch: 40 }, { wch: 50 }, { wch: 30 },
      { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Import Template');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ticket-import-template.csv"');
      return res.send(csv);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ticket-import-template.xlsx"');
    return res.send(buf);
  } catch (err) { next(err); }
}

module.exports = { upload, importFile, previewFile, downloadTemplate };
