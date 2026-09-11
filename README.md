# ছায়া বাড়ি (Chaya Bari)

React + TypeScript + Vite app implementing the company identity and business
profile foundation for ছায়া বাড়ি.

## What's included

- **Business identity config** (`src/config/businessProfile.ts`, `src/types/business.ts`)
  — single source of truth for the business name, logo, contact info, address,
  delivery areas, partners/ownership, and default settings. Nothing is
  hard-coded in components; everything reads from this config through
  `BusinessProfileContext`, so it can later be swapped for data loaded from
  an API without touching pages.
- **Business Profile / Settings page** (`/admin/business-profile`) — lets an
  admin view and update the business name, logo URL, contact/address,
  delivery areas, partners with ownership percentage, each partner's
  application role, and default settings.
- **Ownership vs. application roles kept separate** — a partner's
  `ownershipPercent` is display-only; access/authorization is meant to be
  driven by `applicationRole` (`business_owner_admin`, `kitchen`, `customer`),
  never by ownership percentage.
- **Consistent branding across surfaces** — the `Logo`/`Header` components
  (customer pages, admin dashboard) and `DocumentHeader` (order confirmation,
  invoice/receipt) all pull from the same business profile.
- Seeded with the two initial partners at 50% ownership each: Md. Mozahidul
  Islam Bhuiyan and Tahmina Akter.

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
```

## Project structure

```
src/
  types/business.ts              business profile & partner types
  config/businessProfile.ts      default business profile data
  context/BusinessProfileContext.tsx   app-wide access + in-memory updates
  components/                    Logo, Header, DocumentHeader
  layouts/                       CustomerLayout, AdminLayout
  pages/
    CustomerHome.tsx
    AdminDashboard.tsx
    BusinessProfileSettings.tsx  business profile / settings admin page
    OrderConfirmation.tsx
    Invoice.tsx
```

This is intentionally kept simple per the initial requirements: no complex
shareholder/accounting or legal-entity management — just business owner
profiles, ownership percentages, and basic settings.
