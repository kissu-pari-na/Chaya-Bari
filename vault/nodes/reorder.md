---
id: reorder
title: Order again
prefix: REO
kind: feature
status: live
reviewed: 2026-10-21
code:
  - client/src/components/ReorderButton.tsx
  - client/src/components/ReorderButton.css
relations:
  - extends cart — fills the cart from a previous order
  - depends-on orders — reads the previous order's lines
  - depends-on catalog — uses today's prices and availability
---
"Order again" puts a previous order's items into the cart at today's prices,
skips items no longer on sale, then opens the cart for edits. When the cart
already has items, the customer chooses whether to replace or add.

## Rules
- **R-REO-001** [must] Reordering always uses today's prices and availability, never the old order's captured prices.
- **R-REO-002** [must] The customer is told which items were skipped and whether any price changed.
- **R-REO-003** [must] An existing cart is never silently overwritten. The customer picks replace or add.

## Decisions
- **D-REO-001** [confirmed 2026-09-26] Reorder goes through the cart (editable), not straight to a placed order (commit f99b425).
  Why: customers often tweak quantities, and a one-click order would skip the date and slot choice.

## Ideas
- **I-REO-001** [new · impact:med · effort:S] Show an "Order your usual" shortcut on the home page for signed-in customers with a previous delivered order.
