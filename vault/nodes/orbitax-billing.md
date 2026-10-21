---
id: orbitax-billing
title: Orbitax corporate billing
prefix: ORB
kind: feature
status: deprecated
reviewed: 2026-10-21
code:
  - server/src/utils/orbitax.ts
  - client/src/lib/orbitax.ts
relations:
  - extends wallet — Orbitax staff use the ordinary wallet (with a raised limit)
  - uses pricing-discounts — automatic Orbitax coupon
---
Orbitax staff (`orbitax.com` emails) keep two perks: ordering to their
Mohakhali office and the automatic delivery coupon. Their separate combined
billing page was merged into the wallet on 2026-10-21, and `/orbitax` now
redirects to `/wallet`.

## Rules
- **R-ORB-001** [must] Orbitax perks (office area, auto coupon) are gated by email domain (`orbitax.com` or a subdomain), checked on the server.
- **R-ORB-002** [should] Orbitax staff who order on account use pay later. Give them a WALLET_LIMIT promo code (or a series of them) sized to their usual tab.

## Decisions
- **D-ORB-001** [confirmed 2026-09-19] Add Orbitax combined billing.
  Why: office staff order often and prefer settling once a week or month.
- **D-ORB-002** [confirmed 2026-10-21] Merge Orbitax combined billing into the wallet and retire the separate page (owner: "Merge into wallet"). This rewrote R-ORB-001 and R-ORB-002.
  Why: one system to maintain; the wallet already gives a combined balance.

## Ideas
- **I-ORB-001** [rejected 2026-10-21 · impact:low · effort:S] A monthly Orbitax statement.
  Rejected: superseded by the general wallet statement idea (I-WAL-004).
