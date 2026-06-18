# Deployment Guide — IT Ticketing System

Target stack: **Netlify** (frontend) + **Railway or Render** (backend) + **PostgreSQL** (managed).

## 1. Database
**Railway**: New Project → Provision PostgreSQL → copy `DATABASE_URL` from Variables tab.
**Render**: New → PostgreSQL → copy External Database URL.

Push schema once:
```bash
DATABASE_URL="<url>" npx prisma db push
DATABASE_URL="<url>" node prisma/seed.js
```

## 2. Backend — Railway
1. New Project → Deploy from GitHub → root directory `backend`
2. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`, `PORT=5000`
3. Start command: `node src/server.js`
4. After deploy, run via shell: `npx prisma db push && node prisma/seed.js`
5. Copy the Railway domain — this becomes your `REACT_APP_API_URL` base

### Backend — Render (alternative)
Build: `npm install && npx prisma generate` · Start: `node src/server.js` · same env vars.

## 3. Frontend — Netlify
1. Add new site → Import from Git → base directory `frontend`
2. Build command: `npm run build` · Publish directory: `frontend/build`
3. Env var: `REACT_APP_API_URL=https://your-backend.../api`
4. Create `frontend/public/_redirects` with: `/*  /index.html  200`
5. Deploy, copy the Netlify URL
6. Update backend `FRONTEND_URL` to this URL and redeploy backend

## 4. Post-deploy checklist
- [ ] `/health` returns success
- [ ] Login page loads, login works with seeded admin
- [ ] **Change seeded admin password immediately**
- [ ] Create test ticket, confirm SLA + activity feed work
- [ ] No CORS errors in console
- [ ] Schedule backups (see DISASTER_RECOVERY.md)

## 5. Env var reference
See `.env.example` at project root.
