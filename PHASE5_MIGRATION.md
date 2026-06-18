# Phase 5 — Ticket Timeline & Activity Feed

## What changed

### Database — 1 new enum, 3 new columns on `activity_logs`

**`ActivityEventType` enum** — 12 typed event values:
`TICKET_CREATED`, `TICKET_ASSIGNED`, `TICKET_UNASSIGNED`, `STATUS_CHANGED`,
`PRIORITY_CHANGED`, `FIELD_UPDATED`, `COMMENT_ADDED`, `INTERNAL_NOTE`,
`EMAIL_SENT`, `EMAIL_RECEIVED`, `TICKET_CLOSED`, `TICKET_REOPENED`

**`activity_logs` table** — new columns:
- `event_type ActivityEventType` — typed event discriminator (default `FIELD_UPDATED`)
- `metadata Json?` — structured data per event type (status before/after, email addresses, field names)
- `is_internal Boolean` — controls visibility for non-IT-staff users

### Backend — new files
| File | Purpose |
|---|---|
| `services/activity.service.js` | `logEvent()`, `logEmailEvent()`, `getActivityFeed()` — merges ActivityLog + Comments newest-first |
| `controllers/activity.controller.js` | `feed` and `logEmail` handlers |

### Backend — updated files
- **`tickets.service.js`**: all `logActivity()` calls replaced with typed `logEvent()` calls; comment adds log `COMMENT_ADDED` / `INTERNAL_NOTE`; status/priority/assignment changes each emit the correct event type
- **`routes/tickets.routes.js`**: `GET /api/tickets/:id/activity` and `POST /api/tickets/:id/activity/email` added
- **`prisma/schema.prisma`**: `ActivityEventType` enum + new `ActivityLog` columns

### Frontend — new files
| File | Purpose |
|---|---|
| `components/tickets/ActivityFeed.jsx` | Unified feed: event icons, status badges, comment bodies, email previews, filter chips, comment composer |
| `components/tickets/TicketInputPanel.jsx` | Left column quick-edit: status, priority, category, subcategory, assignment, department, floor, due date — each saves on change |

### Frontend — updated files
- **`pages/TicketDetail.jsx`**: 3-column layout — Left (TicketInputPanel), Middle (Description + ActivityFeed), Right (SLA + Timeline + Details)
- **`services/api.js`**: `ticketsService.activity(id)`, `ticketsService.logEmail(id, body)` added

---

## Setup on a fresh database (same as Phase 4)

```bash
docker compose up -d db
# ensure DATABASE_URL is set in backend/.env
cd backend
npx prisma db push
node prisma/seed.js
npm run dev
```

## API reference

### `GET /api/tickets/:id/activity`
Returns merged activity feed, newest first.

```json
[
  {
    "id": "...",
    "type": "event",
    "eventType": "STATUS_CHANGED",
    "icon": "swap",
    "color": "#f0a030",
    "label": "Status Changed",
    "detail": "Status changed from OPEN to PENDING",
    "metadata": { "previousStatus": "OPEN", "newStatus": "PENDING" },
    "isInternal": false,
    "user": { "id": "...", "firstName": "Admin", "lastName": "User" },
    "createdAt": "2026-06-05T10:30:00.000Z"
  },
  {
    "id": "...",
    "type": "comment",
    "eventType": "COMMENT_ADDED",
    "detail": "Checked the server room — no physical damage found.",
    "isInternal": false,
    "user": { "id": "...", "firstName": "Demo", "lastName": "Technician" },
    "createdAt": "2026-06-05T10:15:00.000Z"
  }
]
```

### `POST /api/tickets/:id/activity/email`
```json
{
  "direction": "sent",
  "subject": "Re: Network outage TKT-00042",
  "fromAddress": "helpdesk@company.com",
  "toAddress": "user@company.com",
  "bodyPreview": "Hi, we've identified the issue and are working on a fix..."
}
```
