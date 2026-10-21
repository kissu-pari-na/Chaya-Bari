---
id: kitchen
title: Kitchen production board
prefix: KIT
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/kitchen/**
  - client/src/pages/KitchenHome.tsx
  - client/src/pages/Kitchen.css
  - client/src/lib/kitchen.ts
  - client/src/types/kitchen.ts
  - client/src/layouts/KitchenLayout.tsx
relations:
  - depends-on orders — only CONFIRMED and PREPARING orders are the kitchen's
  - triggers notifications — line progress moves order status, which notifies the customer
  - uses ordering-window — the day's orders are sorted by time slot
---
For a chosen fulfillment day, the kitchen sees what to make per product
(quantity and how many orders it spans) and works each order line through
TO_COOK → PREPARING → READY on large, phone- and tablet-friendly controls.
Customer notes for the day are surfaced. Packing is a separate, explicit step.

## Rules
- **R-KIT-001** [must] Only confirmed, non-cancelled orders (CONFIRMED, PREPARING) count toward production.
- **R-KIT-002** [must] Progress is tracked per order line (`OrderItem.kitchenStage`), never per aggregated product, so a new order never inherits another order's progress.
- **R-KIT-003** [must] Order status is derived from its lines: all TO_COOK → CONFIRMED, any progress → PREPARING. "Packed and ready to dispatch" is an explicit action on an order whose lines are all READY. It sets `Order.readyAt` (no status change) and is cleared automatically if a line is sent back.
- **R-KIT-004** [should] Orders are listed by time slot (no slot last), then by creation time.
- **R-KIT-005** [should] Controls are large touch targets and readable at arm's length on a tablet.

## Decisions
- **D-KIT-001** [confirmed 2026-09-13] Track kitchen progress per order line, not per day and product (migrations kitchen_per_order and kitchen_line_stage).
  Why: aggregated per-product status leaked between orders.
- **D-KIT-002** [confirmed 2026-10-21] The kitchen keeps its three line stages and the pack step, but orders stay PREPARING until dispatch, with packing recorded as `readyAt` (part of D-ORD-003). This rewrote R-KIT-001 and R-KIT-003.
  Why: five customer-facing steps without losing the kitchen's detail.

## Ideas
- **I-KIT-001** [new · impact:med · effort:S] Add a printable or "big screen" prep sheet for the day (per-product totals plus per-order packing slips with slot and notes).
- **I-KIT-002** [new · impact:med · effort:M] Play a soft chime on the kitchen board when a new order is confirmed for today, using the existing polling.
