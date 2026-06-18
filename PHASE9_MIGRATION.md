# Phase 9 — Production Readiness

## Carried-forward fixes (applied before new work)
All lint/unused-import fixes from prior phases were reapplied to this codebase:
- `Reports.jsx`: removed duplicate `Tooltip` import (Chart.js vs MUI), removed unused `useRef`, `Line`, `MenuItem`, `Divider`, `RefreshIcon`, `useCategories`, `priorityColor`, `PRIORITY_COLORS_LOCAL`
- `ActivityFeed.jsx`: removed unused `EmailOutlinedIcon`
- `EmailComposer.jsx`: removed unused `smtpMsg` state
- `UserFormDialog.jsx`: removed unused `notifyError`
- `TicketDetail.jsx`: removed unused `AccessTimeOutlinedIcon`
- Duplicate-comment bug fix (Phase 8) confirmed intact — activity feed reads `ActivityLog` only, never re-merges `Comment` rows

## Security additions

**`audit_logs` table** — every login, logout, password change, GDPR action, and bulk operation is recorded with user, IP, user agent, success flag, timestamp.

**Auth hardening** (`auth.service.js`):
- Brute-force lockout: 10 failed attempts per email locks for 15 minutes (in-memory; use Redis for multi-instance deploys)
- Generic "Invalid email or password" error — no user enumeration
- Session tracking: `lastLoginAt`, `lastLoginIp`, `loginCount` on User
- Password change revokes all refresh tokens
- Refresh token rotation on every use

**GDPR endpoints** (`/api/gdpr`):
- `GET /export-my-data` — any user exports their own profile, tickets, comments, and audit history as XLSX
- `POST /anonymise/:userId` — Super Admin only; scrubs PII, deactivates account, revokes sessions

**Audit log viewer** (`/api/audit`) — paginated, filterable by user/action/date, requires `users:view` permission (IT Manager+).

## Performance additions

**Database indexes added**:
- `Ticket`: status, priority, assignedToId, submittedById, categoryId, createdAt, composite (status,priority), composite (slaBreached,status)
- `User`: email, composite (role,active)
- `ActivityLog`: composite (userId,createdAt), eventType
- `RefreshToken`: userId, token
- `Comment`: ticketId
- `Subcategory`: categoryId

These support the existing pagination in `TicketList.jsx` (already page-based) and the filtered queries in Reports/Dashboard.

## Deployment

**`docker-compose.yml`** — production 3-service stack (db/backend/frontend) with healthchecks, env-var driven.
**`backend/Dockerfile`** — multi-stage, prisma generate baked in, healthcheck via wget.
**`frontend/Dockerfile`** — multi-stage build → nginx runtime with SPA routing + gzip + cache headers.
**`.env.example`** — full variable reference for local/Railway/Render/Netlify.
**`docs/DEPLOYMENT.md`** — step-by-step Netlify + Railway/Render + PostgreSQL guide.
**`docs/DISASTER_RECOVERY.md`** — RPO/RTO targets, backup schedule, failure-scenario runbooks.
**`backend/scripts/backup.sh`** / **`restore.sh`** — pg_dump/gzip backup with 30-day retention; restore requires typed confirmation.
**`frontend/public/_redirects`** — Netlify SPA routing.

## Second pass — frontend pages, validation & pagination audit

**`pages/Account.jsx`** — confirmed present and correct: Profile panel (name/email/role/last login/login count/member since via `useAuth()`), Password panel (change password form), Privacy panel (GDPR export button → downloads XLSX via `gdprService.exportMyData()`). Removed one unused import (`AccessTimeOutlinedIcon`).

**`pages/AuditLog.jsx`** — confirmed present and correct: action filter dropdown, date range filter, paginated table with colour-coded action chips, success/fail icons, prev/next pagination. Added the new `PASSWORD_RESET_BY_ADMIN` action to the filter list and colour map (see below).

**Routing** — `/account` (any authenticated user) and `/audit-log` (gated behind `users:view`) confirmed wired in `App.js`; both nav items confirmed present in `Sidebar.jsx`.

**Input validation audit** — reviewed every controller:
- `auth`, `email`, `tickets`, `users`, `activity` controllers use `express-validator` correctly
- `categories`, `reports`, `sla` controllers are GET-only with no body — correctly exempt
- `import` controller validates via multer `fileFilter` + row-level checks in `import.service.js` — correctly exempt
- `gdpr` controller takes only a route param, no body — correctly exempt

No fixes required — all controllers already compliant.

**Pagination audit** — confirmed `tickets.service.js`, `users.service.js`, and `audit.service.js` all cap `pageSize` at 100 via `Math.min(100, pageSize)`. No fixes required.

**Gap closed: admin password reset had no audit trail.** `adminResetPassword()` in `users.service.js` now logs `AUDIT_ACTIONS.PASSWORD_RESET_BY_ADMIN` with the target user and acting admin. Added the new constant to `audit.service.js` and to the frontend `AuditLog.jsx` filter/colour maps.

```bash
docker compose up -d db
cd backend
npm install
npx prisma db push
node prisma/seed.js
npm run dev
```
