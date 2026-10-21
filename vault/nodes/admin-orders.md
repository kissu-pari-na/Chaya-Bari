---
id: admin-orders
title: Orders on a customer's behalf
prefix: ADO
kind: feature
status: live
reviewed: 2026-10-21
code:
  - client/src/pages/admin/NewOrderAdmin.tsx
  - server/src/modules/customers/customer-account.service.ts
  - server/src/modules/orders/admin-order.service.ts
relations:
  - extends orders — admin-created orders follow the same lifecycle
  - depends-on auth — creates or reuses placeholder customer accounts by email
  - constrains ordering-window — admin orders ignore the cutoff and slot limits
---
An admin can place an order for a customer, identified by email, for example
one who ordered by phone or Facebook. If no account exists, a placeholder
customer is created, which the real owner can claim later. The order records
which admin placed it.

## Rules
- **R-ADO-001** [must] Admin orders record `placedById`, the admin's footprint.
- **R-ADO-002** [must] Admin orders have no cutoff and no slot restriction. Only past dates are rejected.
- **R-ADO-003** [must] The customer's notification waits in their inbox, and a placeholder account sees it once claimed.

## Decisions
- **D-ADO-001** [confirmed 2026-09-25] Let admins order on a customer's behalf by email, using placeholder accounts (commit 56842a9).
  Why: many orders still arrive by phone or social media and must be in the system for kitchen, delivery and reports.
- **D-ADO-002** [confirmed 2026-09-26] Remove delivery-time limits on admin orders, including the old "ignore cutoff" checkbox (commit 8fa3caa).
  Why: the owner knows the kitchen's real capacity, so the limits only got in the way.

## Ideas
- **I-ADO-001** [new · impact:med · effort:S] Let an admin search customers by phone as well as by email when starting an order, since phone is what callers give.
