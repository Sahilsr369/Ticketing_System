#!/usr/bin/env bash
set -e

echo "=== IT Ticketing Setup ==="
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Backend ──────────────────────────────────────────────────────────────────
echo "[1/4] Installing backend dependencies…"
cd "$ROOT/backend"
npm install

echo "[2/4] Pushing schema to database (prisma db push)…"
npx prisma db push

echo "[3/4] Generating Prisma client…"
npx prisma generate

echo "[4/4] Seeding database…"
node prisma/seed.js

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "[5/5] Installing frontend dependencies…"
cd "$ROOT/frontend"
npm install

echo ""
echo "=== Setup complete ==="
echo "  Backend:   cd backend && npm run dev"
echo "  Frontend:  cd frontend && npm start"
