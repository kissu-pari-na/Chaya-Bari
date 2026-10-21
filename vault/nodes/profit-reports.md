---
id: profit-reports
title: Profit & reports
prefix: RPT
kind: feature
status: live
reviewed: 2026-10-21
code:
  - client/src/pages/admin/ReportsAdmin.tsx
  - client/src/pages/admin/ContributionSection.tsx
  - client/src/pages/AdminDashboard.tsx
  - client/src/lib/reports.ts
  - client/src/types/reports.ts
relations:
  - feeds analytics — the same figures underpin customer and product analytics
---
Owner-facing money views. Order contribution is net food − product cost +
customer delivery − actual delivery − delivery discount, and is incomplete
until the actual delivery cost is entered. Product profitability per period
excludes delivery. The business profit dashboard covers orders, food sales,
discounts, product cost, gross profit, delivery gain or loss, other expenses
and net profit, plus top products, top customers, low stock, and pending or
awaiting-delivery counts.

## Rules
- **R-RPT-001** [must] Product profitability excludes delivery. Delivery gain or loss is reported on its own.
- **R-RPT-002** [must] An order's contribution is marked incomplete while `actualDeliveryCost` is missing.
- **R-RPT-003** [must] Cancelled orders are excluded from sales and profit.
- **R-RPT-004** [should] The owner sees sales, costs and profit without manual calculation. This is the product's core promise.

## Decisions
- **D-RPT-001** [confirmed 2026-09-12] Use an order-contribution model plus a period business-profit dashboard (Phase 9).
  Why: answers "did this order make money?" and "did this month make money?".

## Ideas
- **I-RPT-001** [new · impact:med · effort:S] A weekly owner digest (email or push): orders, net profit, best seller, and any delivered orders missing delivery cost.
