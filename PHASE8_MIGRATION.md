# Phase 8 — Import / Export + Bug Fixes

## Bug fixes in this phase

### Duplicate comments in Activity Feed
**Root cause**: `addComment()` wrote a `Comment` row to the database AND logged an `ActivityLog` event with the full comment body. The `getActivityFeed()` function then merged both sources, so every comment appeared twice.

**Fix**: `activity.service.js` — `getActivityFeed()` now reads from `ActivityLog` only. Comments are already present in the feed as `COMMENT_ADDED`/`INTERNAL_NOTE` events (written by `addComment`). The Comment table is no longer separately merged.

---

## What was added

### Backend — 3 new files

**`services/import.service.js`**
- `importTickets(rows, importer)` — validates each row, resolves category/subcategory names to IDs, checks for duplicate ticket numbers, creates tickets, logs `TICKET_CREATED` activity event per row
- Validation: title required, description required, priority must be LOW/MEDIUM/HIGH/CRITICAL, status must be LOGGED/OPEN/PENDING/RESOLVED/CLOSED, created date must be a valid ISO date
- Returns `{ imported, skipped, errors[], results[] }`

**`controllers/import.controller.js`**
- `multer` with memory storage (files never written to disk), 10 MB limit, CSV/XLSX only
- `parseWorkbook()` — uses `xlsx` to parse any CSV or Excel buffer into row objects
- `importFile` — parse → validate → import → return result summary
- `previewFile` — parse → return first 5 rows + headers + total count (no DB writes)
- `downloadTemplate` — generates a ready-to-fill XLSX or CSV template with correct column headers and one example row

**`routes/import.routes.js`**
- `GET  /api/import/template?format=xlsx|csv` — download template
- `POST /api/import/preview` — preview file (multipart)
- `POST /api/import/import` — import file (multipart)

**`backend/package.json`** — `multer` added to dependencies.

### Frontend — 2 new/updated files

**`pages/ImportExport.jsx`** — two-panel page:

*Import panel:*
- Download template buttons (XLSX and CSV)
- Template column reference with required field indicators
- Drag-and-drop or click file picker (.csv, .xlsx, .xls)
- Auto-preview on file select (first 5 rows in a table, no DB writes)
- Confirm import button shows row count before committing
- Result summary: imported / skipped / errors with expandable error list

*Export panel:*
- Format selector: CSV or Excel
- Filters: Status, Priority, Category, Date From, Date To
- Single export button — streams download directly

**`components/layout/Sidebar.jsx`** — Import/Export nav item added (visible to users with `tickets:create` permission).

**`App.js`** — `/import-export` route registered.

---

## Setup

```bash
# From project root:
bash start.sh
```

Or manually:
```bash
docker compose up -d db
cd backend
npm install        # installs multer
npx prisma db push
node prisma/seed.js
npm run dev
```

---

## Import template columns

| Column | Required | Values |
|---|---|---|
| Ticket Number | No | Auto-generated if blank |
| Title | **Yes** | Free text |
| Description | **Yes** | Free text |
| Category | No | Must match a category name exactly |
| Subcategory | No | Must match a subcategory name within the category |
| Priority | No | LOW / MEDIUM / HIGH / CRITICAL (default: MEDIUM) |
| Status | No | LOGGED / OPEN / PENDING / RESOLVED / CLOSED (default: LOGGED) |
| Created Date | No | ISO date e.g. 2026-06-01 |

Max 5,000 rows per import file.
