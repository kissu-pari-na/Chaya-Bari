---
id: reviews
title: Reviews & ratings
prefix: REV
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/reviews/**
  - client/src/pages/OrderReview.tsx
  - client/src/pages/OrderReview.css
  - client/src/components/ProductReviews.tsx
  - client/src/components/ProductReviews.css
  - client/src/components/RatingStars.tsx
  - client/src/components/StarPicker.tsx
  - client/src/lib/reviews.ts
  - client/src/types/review.ts
relations:
  - depends-on orders — only delivered orders can be reviewed
  - feeds storefront — top reviews, site rating, per-product averages
  - uses notifications — the day-after review invite
---
Reviews are tied to a delivered order: one per product in the order, plus one
optional overall review. A rating is 1–5 whole stars (default 5) with optional
text. The day after delivery the customer is invited by notification and
email. Product averages and the site-wide rating exclude overall reviews.

## Rules
- **R-REV-001** [must] Only the order's own customer can review, only once it is DELIVERED, and only products that order contains.
- **R-REV-002** [must] Reviews are immutable. There is at most one per (order, product) and one overall per order, and they are never updated.
- **R-REV-003** [must] The review invite is sent once per order, the day after delivery, and never for guest orders.
- **R-REV-004** [must] Ratings shown on products and the site come from product reviews only, not overall reviews.

## Decisions
- **D-REV-001** [confirmed 2026-09-13] Make reviews order-based and immutable, with a default of 5 stars.
  Why: tying a review to a real delivered order makes every review verified. Immutability keeps ratings honest.

## Ideas
- **I-REV-001** [new · impact:med · effort:M] Let the owner post a public reply under a review. Replying shows care, which is the brand promise.
- **I-REV-002** [new · impact:low · effort:S] Show "Verified order" on each review, since they all are.
