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
  provider/tracking (no estimated cost); progress is the order's own status
- **Phase 7** — payments: a per-customer wallet ledger, pay first / pay later /
  cash on delivery, manual payment claims
- **Phase 8** — inventory & costing: materials, purchases with weighted-average
  cost, recipes, per-unit product cost
- **Phase 9** — expenses & profit: business expenses, order contribution,
  product profitability, business profit dashboard
- **Phase 10** — analytics: customer behavior, product demand×profit
  classification, sales-by-day
- **Phase 11** — automation: in-app notifications and web push

## Knowledge vault & design system

- **[`vault/`](vault/README.md)** is the project's knowledge graph. Each feature is a node holding its rules, decisions, open questions and improvement ideas, and the edges are how features relate. AI agents must follow [`vault/PROTOCOL.md`](vault/PROTOCOL.md) (also referenced from [`CLAUDE.md`](CLAUDE.md)). Open `vault/graph.html` in a browser to explore it, or run `node vault/tools/vault.mjs questions` to see what is waiting on the owner.
- **[`design.md`](design.md)** is the Glossy Glass design system: glass surfaces, seven contrast-checked palettes (Ember & Gold by default) in light, dark and system modes, and calm motion. Check it with `cd client && npm run check:design`.

## Tech stack

| Layer     | Choice                                   |
|-----------|------------------------------------------|
| Frontend  | React + Vite + TypeScript (`client/`)    |
| Mobile    | React Native + Expo, EAS Build (`mobile/`) |
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
  mobile/   Android & iOS customer app (React Native + Expo), see mobile/README.md
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
    utils/                 httpError, password (legacy column filler), jwt
    modules/
      auth/                Google sign-in / me
      health/             health + db checks
```

### client/ (React)

```
client/src/
  lib/apiClient.ts         fetch wrapper + token storage
  context/AuthContext.tsx  auth state, JWT persistence, /me on boot
  context/BusinessProfileContext.tsx
  components/ProtectedRoute.tsx   role-based route guard
  pages/                   Login (Google), CustomerHome, AdminDashboard,
                           BusinessProfileSettings, KitchenHome, ...
  layouts/                 Customer / Admin / Kitchen layouts
```

## Phase 1 — what's implemented

- **Authentication**: **Google sign-in only**, for customers and staff alike
  (`POST /api/auth/google`), `GET /me`, and JWT bearer tokens. A first Google
  sign-in creates a CUSTOMER account; a missing phone number is asked for at
  checkout. There are no passwords, email codes or password resets.
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
cp .env.example .env          # then edit DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID, SEED_*_EMAIL
npm run prisma:migrate        # create the schema (needs a running Postgres)
npm run seed                  # create initial admin + kitchen accounts
npm run dev                   # http://localhost:4000
```

Seeded staff accounts come from `SEED_ADMIN_EMAIL` and `SEED_KITCHEN_EMAIL`.
Set them to the **Google accounts** the owner and the kitchen sign in with.
More staff can be added later from Admin → Users, by their Google email.

Sign-in needs a Google OAuth client: create a "Web application" client in Google
Cloud Console, add `http://localhost:5173` (and your live site) as an Authorized
JavaScript origin, and set the same ID as `GOOGLE_CLIENT_ID` (server) and
`VITE_GOOGLE_CLIENT_ID` (client).

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env          # set VITE_GOOGLE_CLIENT_ID; VITE_API_URL defaults to http://localhost:4000/api
npm run dev                   # http://localhost:5173
```

Sign in with Google: a new Google account becomes a customer, and a seeded or
admin-created email signs in as that staff member. Each role lands on its own area:
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
  job. The confirmation screen invites the guest to sign in with Google (track orders,
  history, faster checkout, reviews).
- **Address phone is optional + backfilled**: an address can be saved without a
  phone; at checkout a missing address phone is auto-filled from the customer's
  profile number (which itself is captured at checkout when absent) and saved
  back onto the address.
- **Delivery-area coverage**: orders are only accepted for serviceable areas
  (grouped into zones — Mirpur 12/DOHS, ECB Chattar/Matikata, Manikdi/Balughat,
  Baunia). The area is chosen from a zone-grouped selector on saved addresses and
  guest checkout, checkout warns/blocks an out-of-coverage address, and the
  server refuses any order outside coverage. Orbitax (`orbitax.com`) accounts may
  also order to their Mohakhali office. The `/contact` page lists all zones. The
  area list lives in `delivery-areas.ts` (server) mirrored in the client.
- **Order cancellation rules**: a customer can cancel their own order only while
  it is still pending; once confirmed or beyond, the order page tells them to
  contact the business, linking a public **/contact** page built from the
  business profile. An admin can cancel only from pending/confirmed (never once
  preparing has started). Cancelling reverses the order's wallet charge; any
  money already paid stays in the customer's wallet as credit. Once cancelled,
  the order is locked — no status or payment-method changes. Customers and
  admins are notified on cancellation.
- **Missing phone capture**: a phone number is optional on some accounts (e.g.
  Google sign-in). Customers can add/edit their own name and phone from the
  profile (`PATCH /api/auth/me`); a storefront-wide banner and a checkout field
  prompt for a missing number so delivery contact is collected while ordering.

## Phase 4 — what's implemented

- **Admin order management**: list orders with filters (status, payment
  status, search by order/customer, fulfillment date range) and an order page
  built around one **next step** card (confirm → dispatch → mark delivered,
  collecting COD cash on delivery), with money, delivery and customer cards
  beside it.
- **Five order steps everywhere**: Placed → Confirmed → Preparing → On the way
  → Delivered (plus Cancelled). Packing is the kitchen's `readyAt` marker, not
  a status. Admins may dispatch straight from Confirmed.
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
- **Prep/pack status**: each order line moves To cook → Preparing → Ready on
  large, phone/tablet-friendly controls; an order whose lines are all ready can
  be marked **packed** (`Order.readyAt`). Only confirmed, non-cancelled orders
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
- **Admin delivery management**: dispatching an order ("On the way") records
  who delivers it (provider or rider) and a tracking reference or phone; the
  actual cost is entered later. The delivery record has **no status of its
  own** — progress is the order status. A deliveries list shows the per-order
  difference and rolled-up delivery gain/loss.
- **Customer view**: who is delivering and the tracking reference, on their
  order — cost details are never exposed to customers.

## Phase 7 — what's implemented

- **Wallet** (one per customer): a signed ledger of `WalletEntry` rows — order
  charges, order refunds, payments and admin adjustments — each with a status
  (pending / confirmed / rejected), who, when and a reference. Balance = sum of
  confirmed entries. Entries are never deleted; corrections are new entries.
  Customers see it as a timeline at **/wallet**.
- **Three payment modes** chosen at checkout:
  - **Pay first** — the order stays *Placed* until its payment is confirmed,
    then confirms itself. Free wallet credit is used automatically.
  - **Pay later** — the amount goes onto the wallet immediately. Allowed only
    while unpaid wallet debt stays within the **credit limit** (৳100 by
    default, admin-configurable; checked under a per-customer lock).
  - **Cash on delivery** — settled when the admin marks it delivered and
    collected.
  Guests can choose pay first or cash on delivery.
- **Manual payment claims**: there is no online gateway. Customers send money
  to the business's bKash / Nagad / Rocket / bank account (shown with copy
  buttons) and claim it with the transaction reference. A claim is pending
  until an admin confirms (counted) or rejects it (a note is required).
  Duplicate references are refused.
- **Promo codes that raise the limit**: a `WALLET_LIMIT` coupon temporarily
  raises a customer's credit limit for a set number of days.
- **Admin**: a wallets list with totals and a pending-claims queue, a per-customer
  wallet page with the timeline, and **adjust** (credit or debit, reference
  required). Order pages show paid / due / on wallet and can record a payment.
- **Orbitax staff** use the ordinary wallet (the old `/orbitax` page redirects to
  `/wallet`); they keep the office delivery area and the automatic coupon.

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
  placed (→ customer + admins), order status changes (→ customer), wallet claims
  submitted (→ admins) and confirmed/rejected (→ customer), wallet adjustments,
  and the review invite. A header bell
  shows the unread count with a dropdown to read and mark-all-read.
  **Bilingual**: each notification is stored with a message key + params (plus a
  Bengali fallback), and the bell renders the text in the active UI language, so
  it follows the Bangla/English toggle.
- **Web Push (phone notifications)**: the same events are also delivered as
  OS-level push notifications. A service worker shows them (with the device's
  standard notification sound/vibration) even when the site is closed; users
  opt in from Profile → "Phone notifications". Requires a VAPID keypair
  (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`; generate with
  `npx web-push generate-vapid-keys`) — when unset the feature is simply hidden
  and everything else works. Subscriptions are stored per device and pruned when
  they expire. (Note: web push uses the standard notification sound, not a
  call-style ring, and iOS requires the site be added to the Home Screen.)
> There is no online payment gateway or delivery-provider API yet: payments are
> claimed manually and dispatch records the provider by hand. A future
> integration hooks into the wallet (payments) and the dispatch step (delivery).

## Mobile app (Android & iOS)

`mobile/` holds the customer app, built with React Native and Expo. Its first
version covers the menu, dish details, the cart, native Google sign-in and the
language, theme and palette settings; checkout opens the website for now. It uses
the same API (no CORS change needed) and the same palette data as the website.
Builds run in the cloud with EAS Build, so neither a Mac nor the Android SDK is
required. Setup, Google OAuth clients and store builds:
**[`mobile/README.md`](mobile/README.md)**. For the iOS app's sign-in, set the
server's optional `GOOGLE_EXTRA_CLIENT_IDS` to the iOS OAuth client id.

## Status

All 11 phases of the spec are implemented — the full flow works end to end:
**customer orders → kitchen sees what to prepare → food is packed → it goes out
for delivery → payment lands in the wallet → the owner sees sales, costs and
profit without manual calculation.**
