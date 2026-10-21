---
id: guest-checkout
title: Guest checkout
prefix: GST
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/orders/customer.ts
  - client/src/pages/Checkout.tsx
  - client/src/pages/OrderConfirmation.tsx
relations:
  - extends checkout — the same flow without an account (POST /api/guest/orders)
  - feeds analytics — guest orders are grouped into one "Guest" bucket
  - uses order-tracking — the tracking link is how a guest follows the order
---
Anyone can order without an account. Contact details and address are entered
inline, plus an optional email. A guest chooses pay-in-advance (the
confirmation shows the manual-payment account details and the order number to
reference) or cash on delivery. Only admins are notified, and the confirmation
invites the guest to sign in with Google.

## Rules
- **R-GST-001** [must] Guest orders have `customerId = null`. Contact details live in the address snapshot and the optional `guestEmail`.
- **R-GST-002** [must] Guest orders are skipped by the review-invite job, because there is no account to review from.
- **R-GST-003** [should] Every guest confirmation invites Google sign-in, listing the benefits: tracking, history, faster checkout and reviews. Orders placed with the same email move into the account.

## Decisions
- **D-GST-001** [confirmed 2026-09-19] Allow guest ordering, with a prepay option and address phone auto-fill.
  Why: forcing sign-up before a first order loses first-time customers.
- **D-GST-002** [confirmed 2026-10-21] Keep guest checkout alongside Google-only sign-in (D-AUTH-004). Google sign-in stays optional for ordering.
  Why: the fastest first order needs no account at all.
- **D-GST-003** [confirmed 2026-10-21] Guests can choose pay first or cash on delivery, not pay later (D-WAL-005). After a pay-first guest order, the confirmation shows the payment accounts with copy buttons and the order number as the reference.
  Why: a wallet needs an account.

## Ideas
- **I-GST-001** [new · impact:high · effort:M] Also attach past guest orders by **phone** number. Same-email guest orders already move into the account on Google sign-in, but many guests type a phone without an email.
