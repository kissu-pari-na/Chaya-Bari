---
id: order-tracking
title: Order tracking
prefix: TRK
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/orders/tracking.service.ts
  - client/src/pages/TrackOrder.tsx
  - client/src/components/OrderTracker.tsx
  - client/src/components/OrderTracker.css
  - client/src/lib/orderTracking.ts
relations:
  - depends-on orders — renders order status as a timeline
  - uses email — the confirmation email carries the tracking link
  - uses wallet — payment shows as the next action ("pay ৳X", "keep ৳X cash ready"), never as a step
---
A 5-step stepper (Placed, Confirmed, Preparing, On the way, Delivered),
the same for every payment method, under a "now" banner that says in plain
words what happens next: pay ৳X, keep ৳X cash ready, packed and leaving soon,
and so on. Each order can carry a secret tracking token. `/track/<token>`
shows its progress to anyone holding the link, with no login, which serves
guests and customers of admin-placed orders.

## Rules
- **R-TRK-001** [must] The tracking token is 192 random bits, created on first use, and unguessable.
- **R-TRK-002** [must] The public tracking page never shows the street address or phone number, in case the link is forwarded.
- **R-TRK-003** [must] The "order confirmed" email with the link is sent at most once per order, whether an admin confirmed it or full payment did, and a mail failure never blocks confirmation.
- **R-TRK-004** [must] The tracker never claims a step that hasn't happened, such as "Confirmed" before the order is confirmed. Payment is never a step of its own: it appears as the next action.

## Decisions
- **D-TRK-001** [confirmed 2026-09-25] Email a tracking link when an order is confirmed, and open tracking links for signed-in staff too.
  Why: guests and placeholder customers had no way to follow their order.
- **D-TRK-002** [confirmed 2026-10-21] Use the same five steps for every payment method, with the payment action in the banner (part of D-ORD-003).
  Why: one mental model for customers.

## Ideas
- **I-TRK-001** [new · impact:med · effort:S] Add "Add to calendar" (an .ics file with the delivery slot) on the tracking page and confirmation.
