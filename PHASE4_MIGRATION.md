# Phase 4 — SLA & Ticket Lifecycle Tracking

## What changed

### Database

Two new tables added to the schema:

**`sla_policies`** — one row per priority, defines SLA targets:
| Priority | First Response | Resolution |
|----------|---------------|------------|
| CRITICAL | 15 min        | 4 hrs      |
| HIGH     | 60 min        | 8 hrs      |
| MEDIUM   | 4 hrs         | 24 hrs     |
| LOW      | 8 hrs         | 48 hrs     |

**`ticket_history`** — one row per status transition:
- `previous_status`, `new_status`, `changed_by_id`, `changed_at`
- `duration_in_previous_state_seconds` — how long the ticket was in the previous state
- `note` — human-readable context

**`tickets`** — four new columns:
- `first_response_at` — set on first assignment
- `sla_breached` — boolean, updated after every state change
- `first_response_breached` — boolean, set when first response deadline passes

### Backend — new files
| File | Purpose |
|---|---|
| `services/sla.service.js` | `recordTransition()`, `checkAndUpdateSla()`, `getTicketTimeline()`, `getSlaReport()` |
| `controllers/sla.controller.js` | `timeline`, `slaReport` handlers |

### Backend — updated files
- **`tickets.service.js`**: every status/assignment change now calls `recordTransition()` + `checkAndUpdateSla()`; `firstResponseAt` set on first assignment; `TICKET_SELECT` includes new SLA fields; dashboard includes `slaBreached` alert count
- **`routes/tickets.routes.js`**: `GET /api/tickets/:id/timeline` added
- **`routes/reports.routes.js`**: `GET /api/reports/sla` added

### Frontend — new files
| File | Purpose |
|---|---|
| `components/tickets/SlaMetrics.jsx` | SLA status banner, stat boxes (first response / resolution time), progress bar |
| `components/tickets/TicketTimeline.jsx` | Vertical lifecycle timeline with status dots, duration badges, who changed it |

### Frontend — updated files
- **`services/api.js`**: `ticketsService.timeline(id)`, `reportsService.sla(params)` added
- **`pages/TicketDetail.jsx`**: Lifecycle Timeline panel (left column), SLA & Performance panel (right sidebar), SLA BREACHED chip in header
- **`pages/Dashboard.jsx`**: SLA breached active alert badge added

---

## Setup on a fresh database

```bash
# 1. Start Postgres
cd /path/to/project
docker compose up -d db

# 2. Set DATABASE_URL in backend/.env
# postgresql://helpdesk:helpdesk_dev@localhost:5432/it_ticketing?schema=public

# 3. Push schema and seed
cd backend
npx prisma db push
node prisma/seed.js

# 4. Start backend
npm run dev

# 5. Start frontend (separate terminal)
cd ../frontend
npm start
```

Or use the setup script: `bash scripts/setup.sh`

---

## API reference

### `GET /api/tickets/:id/timeline`
Returns full lifecycle history + SLA metrics for a single ticket.

```json
{
  "success": true,
  "data": {
    "ticketId": "...",
    "ticketNumber": "TKT-00042",
    "currentStatus": "OPEN",
    "priority": "HIGH",
    "metrics": {
      "timeToFirstResponseSeconds": 1823,
      "timeToResolutionSeconds": null,
      "ageSeconds": 7412,
      "slaBreached": false,
      "firstResponseBreached": false,
      "slaConsumedPercent": 26
    },
    "slaTargets": {
      "firstResponseMinutes": 60,
      "resolutionMinutes": 480,
      "firstResponseDeadline": "2026-06-05T10:15:00.000Z",
      "resolutionDeadline": "2026-06-05T17:00:00.000Z"
    },
    "history": [
      {
        "id": "...",
        "previousStatus": null,
        "newStatus": "LOGGED",
        "changedAt": "2026-06-05T09:15:00.000Z",
        "durationInPreviousStateSeconds": null,
        "note": "Ticket TKT-00042 created",
        "changedBy": { "id": "...", "firstName": "John", "lastName": "Smith" }
      },
      {
        "id": "...",
        "previousStatus": "LOGGED",
        "newStatus": "OPEN",
        "changedAt": "2026-06-05T09:45:23.000Z",
        "durationInPreviousStateSeconds": 1823,
        "note": "Assigned to Jane Doe — status moved to OPEN",
        "changedBy": { "id": "...", "firstName": "Admin", "lastName": "User" }
      }
    ]
  }
}
```

### `GET /api/reports/sla`
Optional query params: `priority`, `categoryId`, `dateFrom`, `dateTo`

```json
{
  "data": {
    "summary": {
      "total": 142,
      "breached": 12,
      "breachRate": 8,
      "firstRespBreached": 5,
      "resolved": 97,
      "avgResolutionSeconds": 14400,
      "avgFirstResponseSeconds": 2340
    },
    "byPriority": [
      { "priority": "CRITICAL", "total": 8,  "breached": 2, "resolved": 7, "avgResolutionSeconds": 9800 },
      { "priority": "HIGH",     "total": 34, "breached": 5, "resolved": 28, "avgResolutionSeconds": 22000 }
    ]
  }
}
```
