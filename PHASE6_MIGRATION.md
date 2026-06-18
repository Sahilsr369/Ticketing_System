# Phase 6 — Email Integration

## What changed

### Database — 1 new enum, 1 new table, 1 new relation

**`EmailDirection` enum** — `SENT` | `RECEIVED`

**`ticket_emails` table:**
| Column | Type | Purpose |
|---|---|---|
| `id` | UUID PK | |
| `ticket_id` | FK → tickets | |
| `direction` | EmailDirection | SENT or RECEIVED |
| `from_address` | String | Sender address |
| `to_address` | String | Recipient(s), comma-separated |
| `cc` | String? | CC addresses |
| `subject` | String | Email subject |
| `body` | String | Plain-text body |
| `body_html` | String? | HTML body (for received emails) |
| `message_id` | String? unique | RFC 2822 Message-ID for threading |
| `in_reply_to` | String? | Parent message_id |
| `sent_at` | DateTime | When the email was sent/received |
| `sent_by_id` | FK → users? | Who sent it (null for received) |

**`User`** gets `sentEmails` relation. **`Ticket`** gets `emails` relation.

### Backend — new files
| File | Purpose |
|---|---|
| `utils/mailer.js` | nodemailer wrapper — reads SMTP from env, gracefully skips if not configured, `verifySmtp()` health check |
| `services/email.service.js` | `sendTicketEmail()`, `receiveEmail()`, `getTicketEmails()`, `getEmailById()`, `buildReplyDefaults()` |
| `controllers/email.controller.js` | `list`, `getOne`, `send`, `receive`, `replyDefaults`, `smtpStatus` handlers |
| `routes/email.routes.js` | Mounted at `/api/tickets/:id/emails` |

### Backend — updated files
- **`server.js`**: registers `email.routes` at `/api/tickets/:id/emails`

### Frontend — new files
| File | Purpose |
|---|---|
| `components/tickets/EmailComposer.jsx` | Slide-in panel: To, CC (collapsible), Subject, Body; pre-fills reply defaults from thread; shows SMTP status badge; saves when SMTP offline |
| `components/tickets/EmailThread.jsx` | Right-sidebar email thread: sent/received chips, expand/collapse per email, full metadata, Reply button |

### Frontend — updated files
- **`pages/TicketDetail.jsx`**: Email thread panel in right column; "Email" button in header (IT staff only); EmailComposer overlay; email count chip in header; `loadEmails()` called on mount and after send
- **`services/api.js`**: `emailService` added with `list`, `get`, `send`, `receive`, `replyDefaults`, `smtpStatus`

---

## SMTP configuration

Add to `backend/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="IT Helpdesk <your@gmail.com>"
```

**If SMTP is not configured**, the system runs in offline mode:
- Emails are still saved to the database and shown in the thread
- The activity feed records the email event
- The composer shows an "SMTP offline — email will be saved only" badge
- Send button changes to "Save Email"

**Gmail setup**: Enable 2FA → Google Account → Security → App Passwords → generate one for "Mail".

**Test with Mailtrap** (development):
```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=<mailtrap-user>
SMTP_PASS=<mailtrap-pass>
```

---

## API reference

### `GET /api/tickets/:id/emails`
Returns all emails newest first.

### `GET /api/tickets/:id/emails/reply-defaults`
```json
{ "to": "user@example.com", "subject": "Re: [TKT-00042] Network issue", "inReplyTo": "<abc@helpdesk.local>" }
```

### `GET /api/tickets/:id/emails/smtp-status`
```json
{ "configured": true, "ok": true, "message": "SMTP connection verified" }
```

### `POST /api/tickets/:id/emails/send`
```json
{
  "to": "user@company.com",
  "cc": "manager@company.com",
  "subject": "[TKT-00042] Update on your request",
  "body": "Hi,\n\nWe have identified the issue...",
  "inReplyTo": "<previous-message-id@helpdesk.local>"
}
```

### `POST /api/tickets/:id/emails/receive`
For manual inbound logging or webhook integration:
```json
{
  "fromAddress": "user@company.com",
  "toAddress": "helpdesk@company.com",
  "subject": "Re: [TKT-00042] Update on your request",
  "body": "Thanks for the update...",
  "messageId": "<reply123@mail.company.com>",
  "inReplyTo": "<previous@helpdesk.local>",
  "sentAt": "2026-06-05T10:30:00Z"
}
```

---

## Setup (same as previous phases)

```bash
docker compose up -d db
cd backend
npx prisma db push
node prisma/seed.js
npm run dev
```
