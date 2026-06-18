# Phase 7 — Reporting & Analytics

## What changed

### No database changes
Phase 7 is purely a reporting layer — no schema additions required.

### Backend — updated files

**`services/reports.service.js`** (new, replaces stub) — four dedicated query functions:
- `getVolumeReport()` — daily/weekly/monthly bucket counts with pre-filled gaps for continuous x-axis
- `getStatusReport()` — count + % per status, priority breakdown per status
- `getCategoryReport()` — count per category + nested subcategory detail, uncategorised count
- `getPerformanceReport()` — avg resolution time by priority, SLA compliance %, avg first response, tickets per technician with individual SLA rates
- `getExportData()` — flat row array with all fields for CSV/Excel export

**`controllers/reports.controller.js`** (new, replaces stub):
- `volumes`, `status`, `categories`, `performance`, `exportData`, `sla` (Phase 4 compat)
- `exportData` generates CSV directly in the response stream
- `exportData` generates Excel via `xlsx` with auto-sized columns

**`routes/reports.routes.js`** (updated):
- `GET /reports/volumes?granularity=daily|weekly|monthly&dateFrom=&dateTo=`
- `GET /reports/status?dateFrom=&dateTo=`
- `GET /reports/categories?dateFrom=&dateTo=`
- `GET /reports/performance?dateFrom=&dateTo=`
- `GET /reports/export?format=csv|excel&dateFrom=&dateTo=&status=&priority=&categoryId=`

**`backend/package.json`** — `xlsx` added to dependencies for server-side Excel generation.

### Frontend — updated files

**`pages/Reports.jsx`** — fully rebuilt with 4 Chart.js tabs:

| Tab | Charts | Data |
|---|---|---|
| **Volumes** | Bar chart (daily/weekly/monthly toggle) | Total vs Resolved per period |
| **Status** | Doughnut chart + progress bars | Count + % per status |
| **Categories** | Horizontal bar chart + drill-down table | Count per category, expandable subcategories |
| **Performance** | Stat cards + SLA bar + resolution bar by priority + technician table | All performance metrics |

All tabs share a date range filter. Every tab has CSV and Excel export buttons that download the filtered raw ticket data.

**`services/api.js`** — `reportsService` updated with `volumes`, `status`, `categories`, `performance` endpoints.

---

## Setup

Same as previous phases:

```bash
docker compose up -d db
cd backend
npm install          # installs xlsx
npx prisma db push
node prisma/seed.js
npm run dev
```

---

## Export format

The export downloads a flat Excel or CSV with these columns:

`Ticket Number, Title, Status, Priority, Category, Subcategory, Department, Floor, Users Affected, Submitted By, Submitted By Email, Assigned To, Assigned To Email, Created, First Response, Resolved, Closed, Due, SLA Breached, First Response Breached, Comments`

Filtered by the active date range, status, priority, or category selected in the UI.
