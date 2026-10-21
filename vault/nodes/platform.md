---
id: platform
title: Platform & architecture
prefix: PLT
kind: cross-cutting
status: live
scope: global
reviewed: 2026-10-21
code:
  - server/src/app.ts
  - server/src/index.ts
  - server/src/routes.ts
  - server/src/config/**
  - server/src/lib/**
  - server/src/middleware/**
  - server/src/utils/**
  - server/prisma/schema.prisma
  - server/prisma/migrations/**
  - client/src/lib/apiClient.ts
  - client/src/lib/usePoll.ts
  - client/src/lib/useInfiniteScroll.ts
  - client/src/components/Pagination.tsx
  - client/vite.config.ts
  - client/vercel.json
  - server/vercel.json
relations:
  - uses scheduled-jobs — housekeeping runs through the internal cron endpoint
---
A modular monolith. The React + Vite + TypeScript client is hosted on Vercel.
The Express + TypeScript API runs on Render or Vercel serverless, and Prisma
connects it to PostgreSQL (Supabase). Each business capability is a module
under `server/src/modules/<name>` with routes, controller, service and zod
schemas, mounted by `routes.ts`.

## Rules
- **R-PLT-001** [must] New backend capability lives in its own module under `server/src/modules/<name>/` (routes → controller → service, with zod schemas) and is mounted in `server/src/routes.ts`.
- **R-PLT-002** [must] Routers that serve public endpoints are mounted before any router that mounts at `/` with a blanket `authenticate`. Otherwise the auth gate returns 401 for the public route (see the ordering comments in `routes.ts`).
- **R-PLT-003** [must] Schema changes go through a Prisma migration in `server/prisma/migrations/`. Never edit an applied migration.
- **R-PLT-004** [must] Money is `Decimal(10,2)` on the server, and every financial figure is computed on the server. The client only previews totals and never sends a price the server trusts.
- **R-PLT-005** [must] Admin-only endpoints live under `/api/admin/*` behind `requireRole('ADMIN')`. Kitchen endpoints live under `/api/kitchen` (KITCHEN + ADMIN).
- **R-PLT-006** [should] No new heavy dependencies. The client depends only on react, react-dom and react-router-dom, and styling is plain CSS with design tokens.
- **R-PLT-007** [should] Near-live data uses `usePoll`, which only fires while the tab is visible and refreshes on focus. There is no websocket backend.
- **R-PLT-008** [should] Paginate with infinite scroll on browse feeds (storefront, my orders) and with numbered pages on admin tables.
- **R-PLT-009** [must] Secrets and integration credentials (`BKASH_*`, `VAPID_*`, SMTP, `CRON_SECRET`, Google client id) come from env vars. When one is missing, the feature falls back to a mock, log-only or hidden mode rather than crashing.

## Decisions
- **D-PLT-001** [confirmed 2026-09-11] Build the project as a modular monolith, phase by phase (phases 0–11 in the README).
  Why: one small business and one codebase. Modules keep the seams clean, so parts can be split out later if ever needed.
- **D-PLT-002** [confirmed 2026-09-15] Store rate limits in the database (the `RateLimit` table) and fail open.
  Why: an in-memory limiter is useless on serverless, and blocking real users is worse than letting a few extra requests through.
- **D-PLT-003** [proposed 2026-10-21] The native apps live in `mobile/` as a separate Expo package with its own `package.json`. R-PLT-006 (no heavy dependencies) governs `client/`; the app's React Native and Expo packages stay inside `mobile/`. See mobile-app.
  Why: keeps the website's bundle and dependency list unchanged while the app grows.

## Ideas
- **I-PLT-001** [new · impact:med · effort:M] Add a small test suite, starting with the pure functions (pricing, slots, the status transition table, derived payment status). The project has no automated tests today, so regressions in money logic go unnoticed.
- **I-PLT-002** [new · impact:med · effort:M] Make the client an installable PWA with an offline banner and cached menu. The service worker already exists for push, and customers on flaky mobile data would get a faster first screen.
