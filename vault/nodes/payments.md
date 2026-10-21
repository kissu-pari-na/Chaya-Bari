---
id: payments
title: Payment methods & accounts
prefix: PAY
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/payments/**
  - client/src/pages/admin/PaymentsSection.tsx
  - client/src/lib/payments.ts
  - client/src/lib/paymentLabels.ts
relations:
  - configures wallet — the account numbers and methods customers pay by
  - configures checkout — the three payment methods offered
---
How customers pay. There are three payment modes per order: pay first, pay
later and cash on delivery. Methods are bKash, Nagad, Rocket and bank transfer
(sent manually, then claimed with the TrxID), plus cash. The business's
account numbers are admin-editable (`/payment-info`). Since 2026-10-21 every
money movement is a wallet entry. See the wallet node for the ledger rules.

## Rules
- **R-PAY-001** [must] Unconfirmed claims never count toward what is paid (R-WAL-001).
- **R-PAY-002** [must] Order payment status, `amountPaid`, `amountDue` and `onWallet` are derived from the order's wallet entries. Never set them by hand.
- **R-PAY-003** [must] Money records are never deleted (R-WAL-002). Corrections are new entries with who, when and why.
- **R-PAY-004** [must] The three modes are PAY_FIRST, PAY_LATER and COD (guests: PAY_FIRST or COD). The mode can change only while the order is PENDING.
- **R-PAY-005** [must] There is no online payment gateway. The customer UI shows the business's accounts and a claim form, never a "pay online" button.

## Decisions
- **D-PAY-001** [confirmed 2026-09-15] Replace payment deletion with an auditable void and refund.
  Why: with two partners, every money movement needs a who and a why.
- **D-PAY-002** [confirmed 2026-09-19] Add cash on delivery as a payment mode.
  Why: many customers won't prepay a new home kitchen.
- **D-PAY-003** [confirmed 2026-10-21] Payments became wallet entries, with pay first, pay later and cash on delivery offered at checkout (D-WAL-001). This rewrote R-PAY-001 to R-PAY-005.
  Why: one ledger per customer instead of per-order payment rows.

## Ideas
- **I-PAY-001** [done 2026-10-21 · impact:high · effort:S] When reporting a manual payment, show the exact amount due and a one-tap "copy" for the bKash/Nagad number and the order number, so claims match without the admin having to chase.
- **I-PAY-002** [new · impact:med · effort:S] Show a QR code for the bKash/Nagad number next to the copy buttons, so customers paying from a second phone can scan instead of typing.
