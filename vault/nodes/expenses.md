---
id: expenses
title: Business expenses
prefix: EXP
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/expenses/**
  - client/src/pages/admin/ExpensesAdmin.tsx
relations:
  - feeds profit-reports — other expenses reduce net profit
---
General business expenses (gas, electricity, marketing…) in dynamic,
admin-managed categories, listed by period and summarised by category.

## Rules
- **R-EXP-001** [must] Ingredient and packaging purchases are not expenses. They go through inventory (R-INV-002).
- **R-EXP-002** [should] Keep it simple: no accounting ledger and no double entry.

## Decisions
- **D-EXP-001** [confirmed 2026-09-12] Use dynamic expense categories seeded with common ones (Phase 9).
  Why: the owner can add categories without code changes.

## Ideas
- **I-EXP-001** [new · impact:low · effort:S] Recurring expenses (monthly gas or internet) that pre-fill each month for one-tap confirmation.
