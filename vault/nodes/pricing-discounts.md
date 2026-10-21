---
id: pricing-discounts
title: Pricing, discounts & coupons
prefix: PRC
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/orders/pricing.ts
  - server/src/modules/coupons/**
  - client/src/pages/admin/CouponsAdmin.tsx
relations:
  - depends-on catalog — list and sale prices
  - configures ordering-window — the default delivery charge is part of the order total
  - feeds profit-reports — food and delivery discounts are reported separately
---
Order total = (subtotal − food discount) + delivery − delivery discount. Food
discounts come from product sale prices and FOOD-scope coupons. Delivery
discounts come from DELIVERY-scope coupons. Coupons are PERCENT, FIXED or
FREE_DELIVERY, with an optional minimum net food amount and an expiry.

## Rules
- **R-PRC-001** [must] Food discounts and delivery discounts are always kept separate, from the coupon definition through order fields to reports. Never merge them.
- **R-PRC-002** [must] Total = (subtotal − productDiscount) + deliveryCost − deliveryDiscount, computed on the server. Coupon discounts are previewed at checkout and recomputed on the server.
- **R-PRC-003** [must] A coupon's minimum is checked against the net food amount (after sale prices), not the gross subtotal.
- **R-PRC-004** [must] Totals are never negative. A discount is capped at the amount it discounts.
- **R-PRC-005** [must] WALLET_LIMIT coupons are not discounts. They can only be redeemed in the wallet (R-WAL-005), and checkout or preview refuses them.

## Decisions
- **D-PRC-001** [confirmed 2026-09-11] Keep food and delivery discounts separate (Phase 4 business rule).
  Why: delivery is a pass-through cost. Mixing the two hides whether promotions eat food margin or delivery margin.
- **D-PRC-002** [confirmed 2026-09-16] Orbitax accounts get an automatic coupon.
  Why: it is a corporate arrangement with the Orbitax office.

## Ideas
- **I-PRC-001** [new · impact:med · effort:S] Show "Add ৳X more for free delivery" in the cart when an active FREE_DELIVERY coupon has a minimum the cart is close to.
