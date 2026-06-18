# Disaster Recovery Plan

| Metric | Target |
|---|---|
| RPO | 24 hours |
| RTO | 4 hours |

## Backup strategy
Daily cron: `bash backend/scripts/backup.sh /var/backups/it-ticketing`
Retains last 30 backups automatically. Prefer platform-native backups (Railway/Render) as primary, this script as secondary off-platform copy.

Monthly verification: restore latest backup to scratch DB, run row-count check.

## Failure scenarios

**Database corruption/deletion**: identify latest good backup → `bash scripts/restore.sh <file>` (requires typed `RESTORE` confirmation) → update `DATABASE_URL` if new instance → restart backend → verify `/health`.

**Backend outage**: check platform status → redeploy from last good commit, or migrate Railway↔Render using same env vars.

**Frontend outage**: redeploy to Vercel/alternate static host with same `REACT_APP_API_URL`. Stateless, no data risk.

**Compromised credentials**: rotate `JWT_SECRET`/`JWT_REFRESH_SECRET` (invalidates all sessions) → force password reset → review `audit_logs` for affected user/IP → deactivate/anonymise account if needed.

**Complete environment loss**: Git remote + DB backups are the durable source of truth. Always push to GitHub/GitLab.

## Runbook
```
1. Assess scope
2. Restore from backup if data loss
3. Redeploy if service down
4. Verify /health, login, ticket view, activity feed
5. Notify users
6. Post-incident root-cause note
```
