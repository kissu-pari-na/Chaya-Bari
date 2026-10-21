---
id: analytics
title: Analytics
prefix: ANL
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/analytics/**
  - client/src/pages/admin/AnalyticsAdmin.tsx
relations:
  - uses catalog — product demand × profit classification
---
Customer analytics per period: orders, total spent, average order value,
quantity, discounts received, last order, favourite products and approximate
profit contribution. Products are placed in four quadrants by median units
sold × median gross profit: **Best** (push), **Optimize** (popular, low
profit), **Marketing opportunity** (low demand, high profit) and **Review**
(low on both). Sales by day completes the picture.

## Rules
- **R-ANL-001** [must] Guest orders are grouped under one "Guest" bucket in customer analytics.
- **R-ANL-002** [should] Quadrant thresholds are medians of the period, not fixed numbers.

## Decisions
- **D-ANL-001** [confirmed 2026-09-12] Classify products by demand × profit quadrants (Phase 10).
  Why: tells the owner what to promote, reprice or drop.

## Ideas
- **I-ANL-001** [new · impact:med · effort:M] A "customers to win back" list: customers whose usual ordering gap has passed, with one-tap coupon creation for them.
