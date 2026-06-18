# IT Helpdesk — Ticketing System

A full-stack IT ticketing system built with **React**, **Node.js/Express**, **PostgreSQL**, and **Prisma ORM**.

---

## Tech Stack

| Layer    | Technology                            |
|----------|---------------------------------------|
| Frontend | React 18 + MUI 5 + Chart.js           |
| Backend  | Node.js 20 + Express 4                |
| Database | PostgreSQL 16 via Prisma ORM          |
| Auth     | JWT + Refresh Tokens                  |
| Email    | Nodemailer (SMTP)                     |

---

## ⚡ Quickstart Options

### Option A — GitHub Codespaces (zero setup)

1. Click **Code → Codespaces → Create codespace on main** in GitHub.
2. Wait ~2 minutes while the container builds and `scripts/setup.sh` runs automatically.
3. Two terminals open — run each in its own:

```bash
npm run dev:backend    # Express API  →  port 5000
npm run dev:frontend   # React app    →  port 3000
```

Codespaces automatically forwards both ports and opens the frontend in your browser.

> **Note:** The Codespaces HTTPS URLs are written into your `.env` files automatically by `setup.sh`. You don't need to change anything.

---

### Option B — Local Dev with Docker (recommended for local work)

**Prerequisites:** Docker Desktop (or Colima) + Node 18+

```bash
# 1. Start PostgreSQL sidecar
npm run docker:up

# 2. First-time setup (install deps, migrate DB, seed)
npm run setup

# 3. Start dev servers (two terminals)
npm run dev:backend
npm run dev:frontend
```

---

### Option C — Local Dev with your own PostgreSQL

**Prerequisites:** Node 18+ and a running PostgreSQL instance

```bash
# 1. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Edit backend/.env — set your DATABASE_URL:
#    DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/it_ticketing?schema=public"

# 3. Install, migrate, seed
npm run install:all
npm run db:migrate
npm run db:seed

# 4. Start dev servers
npm run dev:backend
npm run dev:frontend
```

---

## Seed Credentials

| Email                 | Password    | Role          |
|-----------------------|-------------|---------------|
| admin@helpdesk.local  | Admin@12345 | Super Admin   |
| tech@helpdesk.local   | Tech@12345  | IT Technician |

---

## Available Scripts

| Command                  | Description                                      |
|--------------------------|--------------------------------------------------|
| `npm run setup`          | First-run: copy .env, install, migrate, seed     |
| `npm run dev:backend`    | Start Express API with nodemon (port 5000)       |
| `npm run dev:frontend`   | Start React dev server (port 3000)               |
| `npm run install:all`    | Install deps in both backend and frontend        |
| `npm run db:migrate`     | Create and apply a new Prisma migration          |
| `npm run db:migrate:prod`| Apply existing migrations (CI / production)      |
| `npm run db:seed`        | Re-run the seed script                           |
| `npm run db:studio`      | Open Prisma Studio on port 5555                  |
| `npm run build:frontend` | Production build of the React app                |
| `npm run docker:up`      | Start the Postgres container in the background   |
| `npm run docker:down`    | Stop the Postgres container                      |
| `npm run docker:logs`    | Tail Postgres container logs                     |

---

## Project Structure

```
it-ticketing/
├── .devcontainer/
│   └── devcontainer.json     ← Codespaces / VS Code Dev Container config
├── .vscode/
│   ├── launch.json           ← Debug configs for the backend
│   └── extensions.json       ← Recommended extensions
├── scripts/
│   └── setup.sh              ← First-run setup (called by postCreateCommand)
├── docker-compose.yml        ← PostgreSQL sidecar for local dev
├── frontend/                 ← React app
│   ├── .env.example
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── services/
│       └── utils/
└── backend/                  ← Express API
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.js
    └── src/
        ├── routes/
        ├── controllers/
        ├── services/
        ├── middleware/
        └── utils/
```

---

## API Health Check

```
GET http://localhost:5000/health
```

---

## Development Phases

| Phase | Scope                                     | Status      |
|-------|-------------------------------------------|-------------|
| 0     | Project structure, schema, routing        | ✅ Complete  |
| 1     | Auth, RBAC, User Management               | ✅ Complete  |
| 2     | Ticket CRUD, assignment, comments         | ✅ Complete  |
| 3     | Email notifications                       | 📋 Planned  |
| 4     | Reports, CSV/XLSX export                  | 📋 Planned  |
| 5     | Production deployment                     | 📋 Planned  |
