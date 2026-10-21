---
id: bkash
title: bKash online payment
prefix: BKS
kind: integration
status: deprecated
reviewed: 2026-10-21
code:
  - server/src/modules/payments/payment-setting.service.ts
relations:
  - feeds payments — a successful execute records a SUCCESS payment
---
Online bKash checkout (Tokenized Checkout) was removed on 2026-10-21: there
is no merchant account, so customers send money to the business's bKash
number manually and claim it with the TrxID (wallet node). Only the bKash
*account number* remains, in the payment-account settings.

## Rules
- **R-BKS-001** [must] No online bKash flow until the owner has a merchant account and decides to add it back. If it returns, it must record payments as wallet entries, idempotently.

## Decisions
- **D-BKS-001** [confirmed 2026-09-16] Show bKash online payment as "coming soon" in the UI until a merchant account is live.
  Why: no live merchant credentials yet.

- **D-BKS-002** [confirmed 2026-10-21] No bKash merchant account exists yet. The online-payment button stays "coming soon", and customers pay in advance manually (verified claims) or by cash on delivery. Revisit when the owner opens a merchant account.
  Why: owner confirmed there is no merchant account yet.
- **D-BKS-003** [confirmed 2026-10-21] Remove the online bKash checkout code, routes, env vars and "coming soon" button. Direct bKash payment is not available, so customers pay manually and claim. This rewrote R-BKS-001 and retired the old pending-row rule.
  Why: owner: "Direct bkash payment is not available".

## Open questions
- **Q-BKS-001** [answered 2026-10-21 → D-BKS-002] When will the bKash merchant account be live? Turning the button on is an env-var plus UI-flag change.

## Ideas
- **I-BKS-001** [new · impact:high · effort:M] When a merchant account exists, add bKash Tokenized Checkout back as an instant pay-first option that writes wallet entries, removing the manual review queue.
