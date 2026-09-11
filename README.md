# ছায়া বাড়ি (Chaya Bari)

A simple, practical management system for a small homemade food business —
customers place advance orders, the kitchen sees what to prepare, a third-party
service delivers, and the owner sees sales, costs and profit without manual
calculation.

Built as a **modular monolith** and developed **phase by phase** (see the spec
in the project docs). This repo currently implements **Phase 0 (business
identity)**, **Phase 1 (foundation: auth, roles, database)**, and
**Phase 2 (products: categories, products, pricing, availability)**.

## Tech stack

| Layer     | Choice                                   |
|-----------|------------------------------------------|
| Frontend  | React + Vite + TypeScript (`client/`)    |
| Backend   | Node.js + Express + TypeScript (`server/`) |
| Database  | PostgreSQL                               |
| ORM       | Prisma                                    |
| Hosting   | Vercel (client) · Render (server) · Supabase (DB) |

```text
React (Vercel) → Express API (Render) → Prisma → PostgreSQL (Supabase)
```

## Repository layout

```
Chaya-Bari/
  client/   React frontend (customer, admin, kitchen UIs)
  server/   Express API (modular monolith)
```

### server/ (modular monolith)

```
server/
  prisma/
    schema.prisma          User, Role enum, Customer (grows per phase)
    seed.ts                seeds initial Admin + Kitchen accounts
  src/
    index.ts               entrypoint (http server + graceful shutdown)
    app.ts                 express app factory (cors, json, routes, errors)
    routes.ts              mounts each module's router under /api
    config/env.ts          env loading + validation
    lib/                   prisma client, logger
    middleware/            authenticate, requireRole, validate, error handler
    utils/                 httpError, password (bcrypt), jwt
    modules/
      auth/                register / login / me
      health/             health + db checks
```

### client/ (React)

```
client/src/
  lib/apiClient.ts         fetch wrapper + token storage
  context/AuthContext.tsx  auth state, JWT persistence, /me on boot
  context/BusinessProfileContext.tsx
  components/ProtectedRoute.tsx   role-based route guard
  pages/                   Login, Register, CustomerHome, AdminDashboard,
                           BusinessProfileSettings, KitchenHome, ...
  layouts/                 Customer / Admin / Kitchen layouts
```

## Phase 1 — what's implemented

- **Authentication**: register (public → always CUSTOMER), login, `GET /me`,
  JWT bearer tokens, bcrypt password hashing.
- **Roles**: `CUSTOMER`, `ADMIN`, `KITCHEN`. Role-based authorization on the API
  (`requireRole`) and role-based route guards + redirects on the frontend.
  Admin/Kitchen accounts are created via seed, never via public registration.
- **Database**: PostgreSQL via Prisma with migrations; `User` + `Customer`
  entities to start, extended module-by-module in later phases.
- **Foundation**: config/env validation, structured logging, centralized error
  handling, request validation (zod), CORS, graceful shutdown.

## Getting started

### 1. Backend

```bash
cd server
npm install
cp .env.example .env          # then edit DATABASE_URL + JWT_SECRET
npm run prisma:migrate        # create the schema (needs a running Postgres)
npm run seed                  # create initial admin + kitchen accounts
npm run dev                   # http://localhost:4000
```

Default seeded accounts (local dev only — override via `SEED_*` env vars):

```
ADMIN   -> admin@chayabari.local   / admin12345
KITCHEN -> kitchen@chayabari.local / kitchen12345
```

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env          # VITE_API_URL defaults to http://localhost:4000/api
npm run dev                   # http://localhost:5173
```

Register a new account (becomes a customer), or log in with a seeded
admin/kitchen account. Each role lands on its own area:
`/` (customer), `/admin`, `/kitchen`.

## Phase 2 — what's implemented

- **Categories & products**: admin CRUD for product categories and products
  (name, description, image URL, price, category, preparation info).
- **Pricing over time**: each price change is appended to a price-history log;
  historical orders will keep their own captured price (later phase).
- **Availability vs. active**: `isActive` controls catalog visibility;
  `isAvailable` marks sold-out items (shown to customers with a "sold out"
  badge, hidden from ordering).
- **Customer browsing**: public product grid with category filter and a product
  detail page. Admin-only management is separated under `/api/admin/*`.

## Roadmap (next phases)

Customer ordering → Orders & discounts → Kitchen production →
Delivery (customer vs. actual cost) → Payments → Inventory & recipe costing →
Expenses & profit → Analytics & reports → Automation.
