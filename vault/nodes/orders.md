---
id: orders
title: Order lifecycle
prefix: ORD
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/orders/order.controller.ts
  - server/src/modules/orders/order.routes.ts
  - server/src/modules/orders/admin-order.controller.ts
  - server/src/modules/orders/admin-order.service.ts
  - client/src/pages/MyOrders.tsx
  - client/src/pages/OrderDetail.tsx
  - client/src/pages/Orders.css
  - client/src/pages/Invoice.tsx
  - client/src/pages/Document.css
  - client/src/pages/admin/OrdersAdmin.tsx
  - client/src/pages/admin/OrderDetailAdmin.tsx
  - client/src/lib/orders.ts
  - client/src/lib/orderStatus.ts
  - client/src/lib/orderEnums.ts
  - client/src/types/order.ts
relations:
  - depends-on wallet — pay-first orders confirm once paid; charges and refunds go through the wallet
  - triggers kitchen — CONFIRMED orders appear on the production board
  - triggers delivery — dispatching records who delivers it
  - triggers notifications — every status change notifies the customer
  - triggers order-tracking — first confirmation emails the tracking link
  - triggers reviews — DELIVERED stamps deliveredAt, which drives the review invite
  - feeds profit-reports — captured totals are the revenue source
---
Five steps everyone sees: Placed (PENDING) → Confirmed → Preparing → On the
way (OUT_FOR_DELIVERY) → Delivered, with Cancelled as a side exit. "Packed and
ready to dispatch" is the kitchen's `readyAt` marker, not a status. Customers
see a 5-step tracker with the next action in plain words. Admins work the
order from one "next step" card (confirm, then dispatch, then deliver), with
money and delivery details beside it.

## Rules
- **R-ORD-001** [must] Forward-only transitions: PENDING→{CONFIRMED,CANCELLED}, CONFIRMED→{PREPARING,OUT_FOR_DELIVERY,CANCELLED}, PREPARING→OUT_FOR_DELIVERY, OUT_FOR_DELIVERY→DELIVERED. DELIVERED and CANCELLED are terminal. There are exactly these six statuses for every role.
- **R-ORD-002** [must] A PAY_FIRST order cannot be confirmed by hand: it confirms itself when its payment settles (R-WAL-006). PAY_LATER and COD orders are confirmed by an admin.
- **R-ORD-003** [must] A customer can cancel their own order only while it is PENDING. Any wallet charge is reversed and money already paid stays as wallet credit. After that, the order page points them to `/contact`.
- **R-ORD-004** [must] An admin can cancel only from PENDING or CONFIRMED. Cancelling reverses the wallet charge (R-WAL-008).
- **R-ORD-005** [must] Once CANCELLED, the order is locked: no status or payment-method changes. Pending claims linked to it are still reviewed, and land as wallet credit.
- **R-ORD-006** [must] Order financial fields are captured at checkout and never recomputed from current product prices (historical immutability).
- **R-ORD-007** [must] `dispatchedAt` and `deliveredAt` are stamped on the first transition to OUT_FOR_DELIVERY and DELIVERED respectively, and only then.
- **R-ORD-009** [must] Order `paymentStatus` is derived by the wallet module (PENDING, PAID, ON_WALLET, PARTIALLY_PAID, REFUNDED). There is no endpoint to set it by hand.
- **R-ORD-008** [should] Order numbers use the business prefix (`CB`) and are what customers quote when paying manually.

## Decisions
- **D-ORD-001** [confirmed 2026-09-19] Add cancellation rules and a contact page (commit 36e1ae7). Block cancelling while a payment awaits verification (commit 5e61b59).
  Why: a cancelled order must never strand money, and cancelling after cooking starts wastes food.
- **D-ORD-002** [confirmed 2026-09-15] Keep order status in sync with payment for PREPAID orders: auto-confirm when fully paid, and revert to PENDING if a refund or void leaves the order underpaid before cooking starts.
  Why: no manual step between "paid" and "kitchen sees it".
- **D-ORD-003** [confirmed 2026-10-21] Simplify to five statuses everywhere (Placed, Confirmed, Preparing, On the way, Delivered, plus Cancelled), following food-delivery best practice. READY and PACKED merge into PREPARING, with packing kept as `readyAt`. Chosen by the owner ("5 steps everywhere"). This rewrote R-ORD-001 and R-ORD-007.
  Why: the old 8 statuses plus a separate 6-state delivery machine confused customers and admins alike.
- **D-ORD-004** [proposed 2026-10-21] With the wallet, cancelling no longer requires refunding first. The charge is reversed and paid money stays as credit, so customers may cancel a pending order even after paying. This rewrote R-ORD-003, R-ORD-004 and R-ORD-005, and pay-first confirmation is now automatic (R-ORD-002).
  Why: the old rule existed so a cancelled order never stranded money; the wallet now holds that money visibly.
- **D-ORD-005** [proposed 2026-10-21] Admins may dispatch straight from CONFIRMED (skipping Preparing) when nothing needs cooking, and the manual "set payment status" endpoint is removed (R-ORD-009).
  Why: real flexibility for ready-made items; a hand-set payment status contradicted the derived one and needed repairing in the migration.

## Ideas
- **I-ORD-001** [done 2026-10-21 · impact:high · effort:S] On the customer order page, show the next action in plain words ("Pay ৳450 to confirm", "Being cooked, arrives 12–2 pm Friday") above the tracker, so nobody has to interpret status names.
- **I-ORD-002** [new · impact:med · effort:M] Bulk status actions on the admin orders list (for example "mark all of today's packed orders out for delivery").
