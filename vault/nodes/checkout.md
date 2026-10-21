---
id: checkout
title: Checkout
prefix: CHK
kind: feature
status: live
reviewed: 2026-10-21
code:
  - client/src/pages/Checkout.tsx
  - client/src/pages/Checkout.css
  - client/src/pages/OrderConfirmation.tsx
  - server/src/modules/orders/order.service.ts
  - server/src/modules/orders/order.schemas.ts
relations:
  - depends-on cart — the order is built from cart lines
  - depends-on ordering-window — date and time slot must be inside the allowed window
  - depends-on delivery-coverage — address area must be serviceable
  - depends-on pricing-discounts — server prices the order authoritatively
  - uses wallet — pay later needs headroom; wallet credit pays pay-first orders
  - uses addresses — pick a saved address or enter one
  - triggers orders — placing creates a PENDING order
  - triggers notifications — customer and admins are notified of a new order
---
The customer picks or enters an address, a fulfillment date (bounded by the
cutoff), a two-hour time slot and a payment method (pay first, pay later or
cash on delivery, from a 3-way picker that shows the pay-later headroom),
applies a coupon, adds notes, and places the order. Guests check
out without an account (see guest-checkout). Admin and kitchen accounts
cannot place orders here.

## Rules
- **R-CHK-001** [must] The server validates the date, slot, area and every price, and is authoritative. Client totals are previews.
- **R-CHK-002** [must] Each order line captures the product name, list price, charged unit price and line total at order time.
- **R-CHK-003** [must] The address is snapshotted onto the order. Editing or deleting the saved address never changes past orders.
- **R-CHK-004** [must] A missing phone number is captured at checkout and saved back to the profile and address.
- **R-CHK-005** [should] Delivery dates are shown with their weekday.
- **R-CHK-006** [must] Pay later is offered only to signed-in customers and only when the order fits their available limit. The server re-checks (R-WAL-004).

## Decisions
- **D-CHK-001** [confirmed 2026-09-19] Customers can change the payment method until the order is confirmed (commit 4955faf).
  Why: customers often switch from transfer to COD (or back) after placing.
- **D-CHK-002** [confirmed 2026-10-21] Offer three payment methods at checkout: pay first, pay later and cash on delivery (D-WAL-001).
  Why: owner's request.

## Ideas
- **I-CHK-001** [new · impact:high · effort:M] Collapse checkout into a single-screen, three-step stepper (Address → When → Pay) with a sticky summary on mobile. Today it is one long form, and a progress cue reduces abandonment.
- **I-CHK-002** [new · impact:med · effort:S] Remember the last-used time slot and payment mode for returning customers and preselect them.
