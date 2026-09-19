# ছায়া বাড়ি (Chaya Bari)

A simple, practical management system for a small homemade food business —
customers place advance orders, the kitchen sees what to prepare, a third-party
service delivers, and the owner sees sales, costs and profit without manual
calculation.

Built as a **modular monolith** and developed **phase by phase**. This repo
implements **all 11 phases** of the spec:

- **Phase 0** — business identity, partners/ownership, roles vs. ownership
- **Phase 1** — foundation: auth, roles, PostgreSQL/Prisma
- **Phase 2** — products, categories, pricing, availability
- **Phase 3** — customer ordering: cart, addresses, checkout with the
  configurable advance-order cutoff
- **Phase 4** — orders & discounts: admin order management, product sale
  prices, coupons (food vs. delivery)
- **Phase 5** — kitchen production dashboard
- **Phase 6** — delivery: customer vs. actual cost, difference,
  provider/tracking, status (no estimated cost)
- **Phase 7** — payments: transactions, methods, derived payment status
- **Phase 8** — inventory & costing: materials, purchases with weighted-average
  cost, recipes, per-unit product cost
- **Phase 9** — expenses & profit: business expenses, order contribution,
  product profitability, business profit dashboard
- **Phase 10** — analytics: customer behavior, product demand×profit
  classification, sales-by-day
- **Phase 11** — automation: in-app notifications, and integration points for a
  delivery provider and a payment gateway

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

## Phase 3 — what's implemented

- **Cart**: client-side cart (localStorage) with quantity controls and a header
  badge; add-to-cart from the product grid and detail page.
- **Delivery addresses**: customers manage their own addresses; each order
  snapshots the address so editing/deleting it never changes past orders.
- **Advance-order cutoff**: admin-configurable cutoff time, minimum advance
  days, delivery charge, and timezone (`OrderingSetting`). The server computes
  the earliest allowed fulfillment date and rejects earlier orders.
- **Checkout**: pick/enter an address, choose a fulfillment date (bounded by
  the cutoff), see delivery cost + total, add notes, and place the order.
  Prices are captured on each order item (historical immutability).
- **My orders**: customers see only their own orders (list + detail with a
  receipt-style breakdown and status). Admin/kitchen accounts cannot place
  orders.
- **Guest ordering**: anyone can order without an account via a public checkout
  (`POST /api/guest/orders`). Contact + address are entered inline; the guest
  picks pay-in-advance (the confirmation shows manual-payment account details +
  the order number to reference) or cash on delivery, and only admins are
  notified. `Order.customerId` is nullable for these; guest orders are grouped
  under a single "Guest" bucket in analytics and skipped by the review-invite
  job. The confirmation screen invites the guest to register (track orders,
  history, faster checkout, reviews).
- **Address phone is optional + backfilled**: an address can be saved without a
  phone; at checkout a missing address phone is auto-filled from the customer's
  profile number (which itself is captured at checkout when absent) and saved
  back onto the address.
- **Missing phone capture**: a phone number is optional on some accounts (e.g.
  Google sign-in). Customers can add/edit their own name and phone from the
  profile (`PATCH /api/auth/me`); a storefront-wide banner and a checkout field
  prompt for a missing number so delivery contact is collected while ordering.

## Phase 4 — what's implemented

- **Admin order management**: list orders with filters (status, payment
  status, search by order/customer, fulfillment date range), an order detail
  view with the full breakdown and customer info, status updates (validated
  transitions), and payment-status updates.
- **Discounts** (food kept separate from delivery, per the business rules):
  - **Product sale price** — an optional promotional price per product; the
    reduction is recorded as a food discount on each order line.
  - **Coupons** — code-based promotions with FOOD/DELIVERY scope and
    PERCENT / FIXED / FREE_DELIVERY kinds, an optional minimum, and expiry.
    These cover order-level, percentage, coupon, and delivery discounts.
  - Customer calculation: `(subtotal − food discount) + delivery − delivery
    discount = total`. Coupon discounts are previewed at checkout and
    recomputed authoritatively on the server.

## Phase 5 — what's implemented

- **Kitchen production dashboard** (KITCHEN + ADMIN): for a chosen fulfillment
  day, the confirmed orders' items are aggregated per product into a simple
  "what to make" list — product, quantity to prepare, and how many orders it
  spans — with total orders and total items at a glance.
- **Prep/pack status**: each product's status (Pending → Preparing → Prepared
  → Packed) is tapped through on large, phone/tablet-friendly controls and
  persists per day (`KitchenTask`). Only admin-confirmed, non-cancelled orders
  count toward production.
- **Special notes**: customer order notes for the day are surfaced for the
  kitchen.

## Phase 6 — what's implemented

- **Delivery record per order** with exactly two cost values: the **customer
  delivery cost** (fixed at checkout, net of any delivery discount) and the
  **actual delivery cost** (what the business pays the provider, entered
  later). The **difference** (customer − actual = delivery gain/loss) is
  derived, never stored, and is `null` until the actual cost is entered. There
  is deliberately **no** `EstimatedDeliveryCost`.
- **Admin delivery management**: create a delivery on the order, set provider,
  tracking reference, actual cost, and status; a deliveries list with the
  per-order difference and rolled-up delivery gain/loss.
- **Customer view**: a read-only delivery summary (status, provider, tracking)
  on their order — cost details are never exposed to customers.

## Phase 7 — what's implemented

- **Payment transactions** recorded separately from the order (not a ledger).
  Each has a method (cash, bKash, Nagad, Rocket, card, bank transfer, online),
  amount, transaction status (success / pending / failed / refunded), a source
  (customer / admin), and an optional reference.
- **Payment mode (prepaid vs cash on delivery)**: an order carries a
  `paymentMode` chosen at checkout. **Prepaid** orders are gated on payment —
  they auto-confirm once fully paid and can't be confirmed while unpaid.
  **Cash-on-delivery** orders skip that gate: they can be confirmed and sent to
  the kitchen while unpaid, and the cash is recorded when they're delivered
  (payment never auto-confirms/reverts their status). The order tracker adapts
  to the mode — prepaid shows a "payment completed" gate before confirmation,
  COD shows the cash payment as the closing milestone after delivery.
- **Derived order payment status**: the order's status
  (Pending → Partially Paid → Paid, or Refunded) is recomputed from its
  payments — net collected = successful payments minus refunds — along with
  `amountPaid` / `amountDue`. **Pending (unverified) claims never count.**
- **Manual payment + verification**: a customer who pays directly (cash or any
  transfer) reports it on their order — method, amount, transaction reference —
  which creates a *pending* claim and notifies admins. An admin **verifies or
  rejects** it from the order's payments panel; only on verify does it count
  toward paid/due. The customer is notified either way.
- **bKash online payment**: a "Pay with bKash" button on the order runs the
  bKash Tokenized Checkout flow (create → redirect → execute) and records a
  confirmed payment automatically on success. It runs in a **sandbox/mock mode**
  out of the box and becomes live by setting the `BKASH_*` env vars — no code
  change (see `server/.env.example`).
- **Admin**: a payments panel lists transactions with source + status, verifies
  pending claims, and records confirmed payments directly. **Customer**: sees
  paid/due, pays via bKash, reports manual payments, and tracks each claim's
  verification status.
- **Orbitax combined billing**: staff whose email is on the `orbitax.com` domain
  (or a subdomain) get a billing shortcut icon in the header linking to
  `/orbitax`. The page shows their **combined outstanding balance** across all
  orders and lets them **pay some or a specific amount**; the amount is allocated
  across their unpaid orders (oldest first) as payment claims that admins verify.
  Access is gated server-side by the email domain.

## Phase 8 — what's implemented

- **Materials** (ingredients & packaging) with a unit, current stock, and a
  **weighted-average unit cost** maintained from purchases (no FIFO/LIFO).
- **Purchases**: a bulk buy with multiple lines updates each material's stock
  and average cost and logs an inventory transaction. (e.g. Milk 20L @ ৳1,800
  → ৳90/L, then 20L @ ৳2,100 → ৳97.5/L weighted average.)
- **Recipes / BOM**: each product can have a recipe (ingredient + packaging
  lines and a batch yield). The **cost per unit** is derived from the
  materials' average costs ÷ yield, and **gross profit per unit** and
  **margin** follow from the selling price.
- **Costing overview**: cost / price / gross profit / margin per product, with
  a link to edit each recipe. Manual stock adjustments are supported for
  corrections/spoilage.

## Phase 9 — what's implemented

- **Business expenses** by category (dynamic categories seeded with Gas,
  Electricity, Marketing, etc.): record, list by period, and by-category
  summary. Ingredient/packaging purchases are kept separate (they update
  inventory, not expenses).
- **Order contribution** (per order): net food − product cost = product gross
  profit, then + customer delivery − actual delivery − delivery discount =
  contribution; marked incomplete until the actual delivery cost is entered.
- **Product profitability** (per period): units sold, revenue, discount, net
  revenue, product cost (from recipes), gross profit, and margin — delivery
  excluded, per the rules.
- **Business profit dashboard** (per period): total orders, food sales,
  discounts, net food sales, product cost, gross profit, delivery
  collected / actual / gain-loss, other expenses, and **net profit**, plus
  top-selling / most-profitable products, top customers, low-stock materials,
  and pending / awaiting-delivery counts.

## Phase 10 — what's implemented

- **Customer analytics** (per period): total orders, total spent, average
  order value, total quantity, discounts received, last order date, favourite
  products, and an approximate profit contribution — answering who buys most,
  most often, and which customers are valuable.
- **Product demand × profit classification**: each product is placed in a
  quadrant relative to the median units sold (demand) and median gross profit
  — **Best** (push), **Optimize** (popular, low profit), **Marketing
  opportunity** (low demand, high profit), and **Review** (low/low).
- **Sales by day**: daily orders, food sales, discounts, net sales, and
  delivery collected — the core of the sales report.

## Phase 11 — what's implemented

- **In-app notifications** (fully working): emitted from real events — order
  placed (→ customer + admins), order status changes (→ customer), and
  successful payments (→ customer + admins). A header bell shows the unread
  count with a dropdown to read and mark-all-read. Email/SMS/push channels can
  be layered on the same events later.
- **Delivery provider integration point** (mock): "dispatch to provider"
  generates a tracking reference and moves the delivery to *assigned* —
  swap the adapter for a real Pathao/pandago client without changing callers.
- **Payment gateway integration point** (mock): "take online payment" records a
  successful charge with a gateway reference — swap for a real bKash / card
  gateway (redirect + webhook) later.

> The provider and gateway pieces are working **mock adapters** with clean
> seams; wiring real third-party APIs needs live credentials and webhooks.

## Status

All 11 phases of the spec are implemented — the full flow works end to end:
**customer orders → kitchen sees what to prepare → food is packed → delivery is
tracked → payment is recorded → the owner sees sales, costs and profit without
manual calculation.**
