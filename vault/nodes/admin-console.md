---
id: admin-console
title: Admin console (shell & dashboard)
prefix: ADM
kind: feature
status: live
reviewed: 2026-10-21
code:
  - client/src/layouts/AdminLayout.tsx
  - client/src/layouts/AdminLayout.css
  - client/src/components/AdminSidebar.tsx
  - client/src/components/AdminIcons.tsx
  - client/src/pages/AdminDashboard.tsx
  - client/src/pages/admin/Admin.css
  - client/src/pages/admin/OrderDetailAdmin.tsx
  - client/src/lib/overview.ts
  - server/src/modules/orders/overview.service.ts
relations:
  - depends-on access-control — admin only
  - uses orders — counts per step and the needs-action list
  - uses wallet — payments to review and money owed
  - constrains design-system — admin surfaces use the same glass tokens
---
The admin's workspace: a glass sidebar of seven short sections (Orders,
Money, Menu, Stock, Insights, Settings, plus the dashboard). It shows live
badges for orders to confirm, orders ready to dispatch and payments to
review, and becomes a drawer on phones. A slim top bar holds language, theme,
palette, notifications and the account. The dashboard answers "what needs me
now?": counts per order step, money owed and to review, and a list of orders
with the action each one waits for. The order page leads with one
"next step" card.

## Rules
- **R-ADM-001** [must] Admin navigation lives in the sidebar sections, not the shared header. A new admin page gets a sidebar entry in the right section, not a new top-level group.
- **R-ADM-002** [must] Badges and dashboard counts come from `GET /api/admin/overview` (one query set), polled. Pages don't invent their own counts.
- **R-ADM-003** [should] An order page always shows the single next action for its step (confirm, then dispatch, then deliver), with cancel only while allowed.
- **R-ADM-004** [must] The language switch stays visible in the admin top bar at every width (R-I18N-001).

## Decisions
- **D-ADM-001** [confirmed 2026-10-21] Restructure the admin: replace the crowded header menu with a sectioned sidebar and a task-first dashboard. Requested by the owner ("the menu is horrible for admin as many menu items there").
  Why: 18 screens didn't fit a header; the owner needs to see what to do next.
- **D-ADM-002** [proposed 2026-10-21] Group the admin screens as Orders (all, new, deliveries), Money (wallets & payments, reports & profit, expenses), Menu (products, categories, coupons & promos), Stock (materials, purchases, costing), Insights (analytics) and Settings (ordering & wallet, business profile, users).
  Why: matches how the owner thinks about the business, from day-to-day work down to setup.

## Ideas
- **I-ADM-001** [new · impact:med · effort:M] Add a command palette (Ctrl+K) to jump to any order number, customer or screen.
- **I-ADM-002** [new · impact:med · effort:S] Add a "today" kitchen-and-delivery timeline on the dashboard (orders by slot with their step) so the owner can plan the day's dispatches.
