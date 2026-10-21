---
id: wallet
title: Wallet (platform-wide ledger)
prefix: WAL
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/wallet/**
  - server/prisma/migrations/20261021120000_wallet_enum_values/**
  - server/prisma/migrations/20261021120100_wallet_and_simple_order_flow/**
  - client/src/lib/wallet.ts
  - client/src/types/payment.ts
  - client/src/pages/Wallet.tsx
  - client/src/pages/Wallet.css
  - client/src/pages/admin/WalletsAdmin.tsx
  - client/src/pages/admin/WalletDetailAdmin.tsx
  - client/src/components/WalletTimeline.tsx
  - client/src/components/ClaimForm.tsx
  - client/src/components/PayToUs.tsx
  - client/src/components/OrderPaymentBox.tsx
  - client/src/components/PayModePicker.tsx
  - client/src/components/Pay.css
relations:
  - constrains checkout — pay later is allowed only within the wallet limit
  - triggers orders — a settled pay-first order confirms itself
  - feeds profit-reports — payments and charges are the money record
  - uses notifications — claim submitted / confirmed / rejected, adjustments
  - uses pricing-discounts — WALLET_LIMIT promo codes raise the limit
  - extends payments — replaces per-order payment rows with one customer ledger
---
Every customer has one wallet: a signed ledger of what they owe and have
paid. Orders are charged to it (pay later at once, pay first when paid, cash
on delivery when delivered). Customers pay manually (bKash, Nagad, Rocket,
bank) and claim the payment with its reference, and an admin confirms it.
Admins can adjust any wallet with a reference. Every movement shows on a
timeline with a running balance. The wallet may go below zero by at most the
pay-later limit: ৳100 by default (admin-editable), raised temporarily by promo
codes. Positive credit is spent automatically on the next order.

## Rules
- **R-WAL-001** [must] The balance is the sum of CONFIRMED `WalletEntry` amounts (+ money in, − money owed). PENDING claims and REJECTED entries never count.
- **R-WAL-002** [must] Entries are never deleted or edited after review. Corrections are new ADJUSTMENT entries, so the timeline is a complete audit trail with who did what and when.
- **R-WAL-003** [must] Every claim and every admin adjustment carries a reference (trx id, bank ref, receipt). A reference already used by a pending or confirmed payment is refused.
- **R-WAL-004** [must] A pay-later order is accepted only if the balance after charging stays ≥ −(limit). The check runs under a per-customer row lock (`SELECT … FOR UPDATE`) so concurrent orders can't slip past it. A refused order leaves nothing behind.
- **R-WAL-005** [must] The limit is `OrderingSetting.walletCreditLimit` (default ৳100) plus active `WalletLimitGrant`s. Grants come only from WALLET_LIMIT promo codes, once per customer per code, and expire after the code's `limitDays`.
- **R-WAL-006** [must] A pay-first order settles (charge posted, PAID, auto-CONFIRMED) when the confirmed payments linked to it plus any free positive credit reach its total. Settlement runs after placement, claim confirmation, admin-recorded payments and positive adjustments.
- **R-WAL-007** [must] Cash on delivery: marking the order DELIVERED posts the charge and the cash collected. A shortfall stays on the wallet (ON_WALLET).
- **R-WAL-008** [must] Cancelling reverses the order's charge (ORDER_REFUND). Money already paid stays as wallet credit, which can be spent or paid back with a debit adjustment.
- **R-WAL-009** [must] Guests have no wallet: they pay first or cash on delivery. Their entries have no customer and move to the account when they sign in with Google on the same email.
- **R-WAL-010** [should] There is no online gateway. Customers see the business's payment accounts with one-tap copy for the account, amount and reference (the order number), then submit the TrxID.

## Decisions
- **D-WAL-001** [confirmed 2026-10-21] Build a platform-wide wallet. The ৳100 default unpaid limit can be raised by promo codes. Customers claim manual payments with references, admins confirm or adjust with references, every transaction shows on a timeline, and orders use pay first, pay later or cash on delivery. Requested by the owner.
  Why: one place for all money between the business and each customer.
- **D-WAL-002** [confirmed 2026-10-21] Keep the ৳100 default limit, even though most single orders exceed it. Pay later is effectively for customers who received a limit-raising code.
  Why: owner's choice; it limits risk on new customers.
- **D-WAL-003** [confirmed 2026-10-21] Positive credit is allowed and spent automatically: a pay-first order covered by credit confirms at once.
  Why: owner's choice; advance payments and overpayments aren't lost.
- **D-WAL-004** [confirmed 2026-10-21] Promo codes raise the limit temporarily (for `limitDays`), not permanently.
  Why: owner's choice.
- **D-WAL-005** [confirmed 2026-10-21] Guests can pay first or cash on delivery only. Pay later needs Google sign-in.
  Why: a wallet needs an account.
- **D-WAL-006** [proposed 2026-10-21] Store the wallet as one signed `WalletEntry` ledger that replaces the `Payment` table. The migration converts old payments (SUCCESS → confirmed, PENDING → pending claim, FAILED/VOID → rejected, REFUNDED → debit adjustment), posts charges for orders that were owed, and credits orders that an admin had marked PAID by hand.
  Why: one source of truth; balances start out correct for existing customers.
- **D-WAL-007** [proposed 2026-10-21] Settlement rule: payments linked to an order cover that order first, plus any *free* positive credit. Existing pay-later debt does not block a pay-first order the customer has paid for.
  Why: otherwise a customer who pays exactly for a pay-first order while owing ৳80 would never see it confirm.
- **D-WAL-008** [proposed 2026-10-21] A COD order collected short at the door leaves the shortfall as wallet debt for an account, or PARTIALLY_PAID for a guest.
  Why: matches how the door actually works; nothing is silently written off.

## Ideas
- **I-WAL-001** [new · impact:high · effort:M] Show the customer's balance and pay-later headroom on the cart page, before checkout, so pay later never comes as a surprise refusal.
- **I-WAL-002** [new · impact:med · effort:S] Remind customers with a balance owed (push and in-app) a day after delivery, with the amount and the copy-ready payment accounts.
- **I-WAL-003** [new · impact:med · effort:M] Let admins attach a screenshot of the bKash SMS or bank slip to a claim review, for disputes.
- **I-WAL-004** [new · impact:low · effort:S] Export a customer's wallet timeline as a printable statement (useful for corporate accounts such as Orbitax).
