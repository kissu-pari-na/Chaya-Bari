---
id: storefront
title: Storefront (home, menu, contact)
prefix: SHOP
kind: feature
status: live
reviewed: 2026-10-21
code:
  - client/src/pages/CustomerHome.tsx
  - client/src/pages/Home.css
  - client/src/pages/ProductList.tsx
  - client/src/pages/ProductDetail.tsx
  - client/src/pages/Products.css
  - client/src/components/ProductCard.tsx
  - client/src/components/ProductCard.css
  - client/src/components/MenuByCategory.tsx
  - client/src/components/Header.tsx
  - client/src/components/Header.css
  - client/src/components/CoverageBanner.tsx
  - client/src/layouts/CustomerLayout.tsx
relations:
  - depends-on catalog — shows active products; sold-out ones carry a badge
  - uses reviews — top reviews and site rating on the home page
  - uses cart — add-to-cart from cards and the detail page
  - constrains design-system — the hero, product cards and trust messaging are the brand's shop window
---
The public shop: a home page (a hero with the top-rated products orbiting
the #1, trust points, featured dishes, real reviews), the product list with a
category filter and infinite scroll, product detail pages, and the contact
page. Guests and customers can browse, and admins can preview it.

## Rules
- **R-SHOP-001** [must] Only real reviews are shown. Never display sample or dummy testimonials.
- **R-SHOP-002** [must] Sold-out (`isAvailable = false`) products stay visible with a "sold out" badge but cannot be added to the cart. Inactive products are not shown.
- **R-SHOP-003** [should] Food photography leads. A product with no image shows a category-matched emoji placeholder rather than a broken image.
- **R-SHOP-004** [should] The brand voice is "premium homemade", not a generic restaurant: trust labels such as 100% Homemade, Fresh Ingredients and Hygienic.
- **R-SHOP-005** [should] Menu cards stay standard size, with the big photo reserved for the product page. Lists of dishes are grouped or filterable by category.

## Decisions
- **D-SHOP-001** [confirmed 2026-09-15] Remove dummy home-page reviews and show only real ones.
  Why: fake social proof erodes trust, which is the whole proposition of a homemade-food brand.
- **D-SHOP-002** [confirmed 2026-09-13] The hero showcases the top-rated products: #1 in the centre, the next three orbiting it.
  Why: it shows the actual menu instead of stock imagery.
- **D-SHOP-003** [confirmed 2026-10-21] Show the home page's popular dishes grouped by category, with a sticky chip bar ("All" shows each category as a section, most popular first), and use standard-size cards (square photo, name, rating, price, one-tap add). That's two per row on phones and five or six on desktop. The product page shows the dish large. Requested by the owner.
  Why: one large card per item showed too little of the menu.

## Ideas
- **I-SHOP-001** [new · impact:high · effort:M] Show "Order by 10 pm for tomorrow" with a live countdown on the home page and product pages, from the ordering-window cutoff. The advance-order model is unusual, and making the deadline visible both explains it and adds healthy urgency.
- **I-SHOP-002** [new · impact:med · effort:S] Add a sticky "View cart · ৳total" bar on mobile once the cart has items, so customers don't have to hunt for the header icon.
- **I-SHOP-003** [new · impact:med · effort:M] Combo or bundle section (design.md lists one): let the admin group products into a combo with a bundle price, shown as a deep-red promo panel.
