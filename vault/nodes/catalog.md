---
id: catalog
title: Product catalog
prefix: CAT
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/products/**
  - client/src/lib/products.ts
  - client/src/types/product.ts
  - client/src/pages/admin/ProductsAdmin.tsx
  - client/src/pages/admin/ProductForm.tsx
  - client/src/pages/admin/CategoriesAdmin.tsx
  - client/public/products/**
relations:
  - feeds pricing-discounts — list price and optional sale price per product
  - feeds kitchen — what to make is grouped by product
  - feeds inventory-costing — each product can have a recipe
---
Products and categories, with Bangla names and optional English twins,
description, image URL, price, optional sale price and preparation info.
`isActive` controls whether a product is in the catalog at all, and
`isAvailable` controls whether it can be ordered today (sold out). Every price
change is appended to `ProductPriceHistory`.

## Rules
- **R-CAT-001** [must] A price change appends a `ProductPriceHistory` row. Past orders keep their captured prices and are never re-priced.
- **R-CAT-002** [must] A sale price applies only when it is below the list price. The reduction is recorded as a food discount on each order line.
- **R-CAT-003** [must] `isActive = false` hides a product everywhere public. `isAvailable = false` keeps it visible but not orderable.
- **R-CAT-004** [should] Product images are URLs (root-relative `/products/...` or absolute). There are no uploads yet.

## Decisions
- **D-CAT-001** [confirmed 2026-09-15] Add bilingual product names (`nameEnglish`), following the moto's pattern.
  Why: English-language customers saw only Bangla names.

## Ideas
- **I-CAT-001** [new · impact:med · effort:M] Add a daily stock limit per product ("only 12 left for tomorrow"). Homemade capacity is finite, and today sold-out is a manual all-or-nothing switch.
- **I-CAT-002** [new · impact:med · effort:M] Allergen and dietary tags (contains nuts, dairy, spicy level) on product cards and filters.
