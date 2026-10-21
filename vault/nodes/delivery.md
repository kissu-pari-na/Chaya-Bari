---
id: delivery
title: Delivery
prefix: DLV
kind: feature
status: partial
reviewed: 2026-10-21
code:
  - server/src/modules/delivery/**
  - client/src/pages/admin/DeliveriesAdmin.tsx
  - client/src/pages/admin/DeliverySection.tsx
  - client/src/lib/delivery.ts
  - client/src/types/delivery.ts
relations:
  - depends-on orders — one delivery record per order
  - feeds profit-reports — delivery gain or loss per order
---
A third party (or a rider) delivers. Each order can have one delivery record
with who delivers it (provider or rider), a tracking reference or phone, and
exactly two cost values: what the customer was charged, and what the business
actually paid. Progress is the order's own status (On the way, then
Delivered). Dispatching from the order page records who delivers it.

## Rules
- **R-DLV-001** [must] There are exactly two cost values: `customerDeliveryCost` (net of any delivery discount) and `actualDeliveryCost` (entered later). There is deliberately no estimated delivery cost.
- **R-DLV-002** [must] The difference (customer − actual) is derived and never stored. It is null until the actual cost is entered.
- **R-DLV-003** [must] Customers see delivery status, provider and tracking, never any cost detail.
- **R-DLV-004** [should] A future provider integration (Pathao, pandago) hooks into the dispatch step, filling provider and tracking, without adding a second status machine.
- **R-DLV-005** [must] The delivery record has no status of its own. Where an order is comes only from `Order.status`.

## Decisions
- **D-DLV-001** [confirmed 2026-09-12] Use two delivery costs and no estimate (Phase 6 business rule).
  Why: estimates were never accurate. Only what was charged and what was paid matter for profit.
- **D-DLV-002** [confirmed 2026-10-21] Remove the delivery record's own status machine and the mock "dispatch to provider". The order status is the one truth, and dispatch is the order's "On the way" step (part of D-ORD-003). This rewrote R-DLV-004 and added R-DLV-005.
  Why: two unsynced state machines for the same journey.

## Ideas
- **I-DLV-001** [new · impact:med · effort:S] Warn the admin on the dashboard about delivered orders still missing an actual delivery cost, since they make contribution reports incomplete.
