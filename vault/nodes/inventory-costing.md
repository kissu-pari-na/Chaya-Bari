---
id: inventory-costing
title: Inventory & product costing
prefix: INV
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/inventory/**
  - client/src/pages/admin/MaterialsAdmin.tsx
  - client/src/pages/admin/PurchasesAdmin.tsx
  - client/src/pages/admin/RecipeAdmin.tsx
  - client/src/pages/admin/CostingAdmin.tsx
  - client/src/lib/inventory.ts
  - client/src/types/inventory.ts
relations:
  - depends-on catalog — recipes belong to products
  - feeds profit-reports — per-unit product cost
---
Materials (ingredients and packaging) have a unit, a stock level and a
weighted-average unit cost maintained from purchases. A recipe (bill of
materials) per product, with a batch yield, gives cost per unit = Σ(material
average cost × qty) ÷ yield. From that follow gross profit per unit and
margin. Manual stock adjustments cover spoilage and corrections. Every stock
movement is logged.

## Rules
- **R-INV-001** [must] Material cost is a weighted average updated on each purchase. No FIFO or LIFO.
- **R-INV-002** [must] Purchases of ingredients and packaging update inventory and are never recorded as expenses.
- **R-INV-003** [must] Every stock change writes an append-only `InventoryTransaction`.
- **R-INV-004** [must] Product cost is derived from the recipe and current average costs, never typed in.

## Decisions
- **D-INV-001** [confirmed 2026-09-12] Use weighted-average costing (Phase 8).
  Why: it is simple, matches how a home kitchen buys in bulk, and is good enough for pricing decisions.

## Ideas
- **I-INV-001** [new · impact:med · effort:M] Deduct recipe materials from stock automatically when an order is packed (`readyAt`), and warn about low stock for tomorrow's confirmed orders, turning "what to buy" into a list.
