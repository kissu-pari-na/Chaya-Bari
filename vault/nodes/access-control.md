---
id: access-control
title: Roles & access control
prefix: ACL
kind: cross-cutting
status: live
scope: global
reviewed: 2026-10-21
code:
  - server/src/middleware/auth.ts
  - client/src/components/ProtectedRoute.tsx
  - client/src/layouts/**
  - client/src/App.tsx
relations:
  - depends-on auth — roles come from the authenticated user
  - constrains storefront — staff are redirected away from shopping pages, except in admin preview
  - constrains orders — staff accounts cannot place orders for themselves
---
There are three application roles: CUSTOMER, ADMIN and KITCHEN. Each role
lands on its own area (`/`, `/admin`, `/kitchen`). Roles are kept separate
from business ownership: the partners in the business profile own the
business, while access is decided by role alone.

## Rules
- **R-ACL-001** [must] Access is decided by role, never by ownership percentage or partner record.
- **R-ACL-002** [must] A first Google sign-in (the only public sign-up) always creates a CUSTOMER. ADMIN and KITCHEN accounts are created only by the seed (`SEED_ADMIN_EMAIL` / `SEED_KITCHEN_EMAIL`) or by an admin (see user-management), and their owners sign in with Google on that email.
- **R-ACL-003** [must] Every role check is enforced on the server (`requireRole`). Client route guards only shape navigation; they are not security.
- **R-ACL-004** [must] Staff (ADMIN/KITCHEN) who open cart, checkout or customer-only pages are sent to their own dashboard. Storefront browsing pages are the exception: an admin sees them in preview mode, under a banner that leads back to the dashboard.
- **R-ACL-005** [must] Public tracking links (`/track/:token`) open for anyone, staff included, without logging in.

## Decisions
- **D-ACL-001** [confirmed 2026-09-11] Keep roles separate from ownership (Phase 0).
  Why: both partners are owners, but who can do what in the app must not depend on equity.
- **D-ACL-002** [confirmed 2026-09-26] Let admins preview storefront pages as customers see them (commit 8fa3caa).
  Why: the owner needs to check the menu and home page without logging out.

## Ideas
- **I-ACL-001** [new · impact:med · effort:M] Add a DELIVERY_RIDER (or "packer") role that sees only today's packed orders and can mark them out for delivery or delivered from a phone. This takes routine status taps off the owner.
