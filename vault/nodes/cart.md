---
id: cart
title: Cart
prefix: CART
kind: feature
status: live
reviewed: 2026-10-21
code:
  - client/src/context/CartContext.tsx
  - client/src/pages/Cart.tsx
  - client/src/pages/Cart.css
relations:
  - depends-on catalog — items reference products and their current price
  - feeds checkout — the cart's lines become the order request
---
A client-side cart, kept in localStorage, with quantity controls and a count
badge in the header. It works for guests and customers alike.

## Rules
- **R-CART-001** [must] Prices shown in the cart are a preview. The server re-prices every line at checkout from current product data.
- **R-CART-002** [should] Unavailable products cannot be added. When a carted product becomes unavailable, checkout refuses it with a clear message.

## Decisions
- **D-CART-001** [confirmed 2026-09-11] Keep the cart in localStorage (Phase 3), with no server-side cart.
  Why: it is simple, works for guests, and needs no extra tables.

## Ideas
- **I-CART-001** [new · impact:low · effort:S] Animate the header cart count when an item is added (design.md §14), and confirm the add with a toast that offers Undo.
