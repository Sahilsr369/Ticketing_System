# Phase 3 — Ticket Categories & Classification

## What changed

### Backend
- **New tables**: `categories` and `subcategories` (replaces the `TicketCategory` enum).
- **`Ticket` model**: `categoryId` (FK → categories) and `subcategoryId` (FK → subcategories) replace the old string enum `category` field. The columns are nullable so existing tickets are unaffected.
- **New route**: `GET /api/categories` — returns all 14 active categories with their nested subcategories.
- **`GET /api/categories/:slug`** — returns a single category by slug.
- **Ticket create/update**: now accepts `categoryId: Int` and `subcategoryId: Int` instead of `category: String`. The API validates that subcategoryId belongs to the supplied categoryId.
- **Dashboard `byCategory`**: now returns `{ categoryId, categoryName, count }` instead of `{ category, count }`.
- **List filter**: `?category=` replaced by `?categoryId=` (integer).

### Frontend
- **`useCategories` hook**: fetches all categories + subcategories once per mount.
- **`TicketFormDialog`**: Category dropdown loads from API. Subcategory dropdown is disabled until a category is selected, then populates with that category's subcategories only (cascading).
- **`TicketList`**: Category filter dropdown loads from API (all 14 categories). Row now shows subcategory name alongside department.
- **`format.js`**: `formatCategory` and `categoryColor` updated to accept `{ id, name, slug }` objects in addition to legacy strings.
- **`ticketConstants.js`**: `CATEGORIES` and `SUBCATEGORIES` removed (now served from API).

---

## Migration steps

### 1. Apply the database migration

Run the migration SQL **before** restarting the backend:

```bash
cd backend
psql $DATABASE_URL -f prisma/migrations/phase3_categories/migration.sql
```

Or via Prisma (if you run `prisma migrate dev`):

```bash
npx prisma migrate dev --name phase3_categories
```

### 2. Generate the updated Prisma client

```bash
cd backend
npx prisma generate
```

### 3. Seed categories and subcategories

```bash
cd backend
node prisma/seed.js
```

This seeds all 14 categories and their subcategories using `upsert` — safe to run multiple times.

### 4. Restart the backend

```bash
npm run dev
```

### 5. Restart the frontend

```bash
cd frontend
npm start
```

---

## The 14 Categories

| # | Category | Subcategory count |
|---|----------|-------------------|
| 1 | User Access & Permissions | 9 |
| 2 | Identity & Authentication | 7 |
| 3 | New Starters / Leavers / Movers | 7 |
| 4 | Email & Microsoft 365 | 10 |
| 5 | Hardware & Asset Management | 10 |
| 6 | Software Installation & Licensing | 8 |
| 7 | Network & Connectivity | 9 |
| 8 | Telephony & Communication | 8 |
| 9 | Printing & Scanning | 8 |
| 10 | Meeting Rooms & AV Equipment | 7 |
| 11 | Security & Compliance | 9 |
| 12 | System Performance & Updates | 8 |
| 13 | Facilities & Infrastructure | 6 |
| 14 | Information Requests | 5 |

---

## API reference

### `GET /api/categories`
Returns all active categories with nested subcategories.

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "User Access & Permissions",
      "slug": "user-access-permissions",
      "sortOrder": 1,
      "subcategories": [
        { "id": 1, "name": "New Account Request", "slug": "new-account-request", "sortOrder": 1 }
      ]
    }
  ]
}
```

### `POST /api/tickets` — updated payload
```json
{
  "title": "Cannot log in",
  "description": "MFA app not generating codes",
  "categoryId": 2,
  "subcategoryId": 5,
  "priority": "HIGH"
}
```

### `GET /api/tickets?categoryId=2`
Filter tickets by category ID.
