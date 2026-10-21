---
id: business-profile
title: Business identity & profile
prefix: BIZ
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/business/**
  - server/src/modules/payments/payment-setting.service.ts
  - client/src/config/businessProfile.ts
  - client/src/context/BusinessProfileContext.tsx
  - client/src/lib/businessProfile.ts
  - client/src/pages/BusinessProfileSettings.tsx
  - client/src/pages/Contact.tsx
  - client/src/components/Logo.tsx
  - client/src/components/DocumentHeader.tsx
relations:
  - configures storefront — name, tagline, logo and contact on every page
  - configures payments — the manual-payment account numbers shown to customers
  - configures email — branding in transactional mail
---
The business identity: Bangla and English name, tagline (moto), logo,
contact, address, partners with ownership percentages, and defaults (BDT,
Bangla, order-id prefix `CB`, Asia/Dhaka). It is stored as a JSON blob in a
singleton row, so every client shares it, and admins edit it in Business
Profile. The public `/contact` page is built from it.

## Rules
- **R-BIZ-001** [must] Business identity is never hard-coded in components. Read it from `useBusinessProfile()`, whose defaults live in `config/businessProfile.ts`.
- **R-BIZ-002** [must] Currency is BDT and the business timezone is Asia/Dhaka (a fixed UTC+6 offset with no DST). Date logic relies on this.
- **R-BIZ-003** [should] The brand name is ছায়া বাড়ি / Chaya Bari, and the tagline is "আস্থার ছায়ায় ঘেরা, গুণ ও মানের বসত বাড়ি / A home of trust, quality and care".

## Decisions
- **D-BIZ-001** [confirmed 2026-09-13] Store the profile in a singleton DB row (a JSON blob), editable by admins.
  Why: identity changes, such as a new phone number or logo, should never need a deploy.

## Ideas
- **I-BIZ-001** [new · impact:med · effort:S] Add opening hours and a "kitchen closed today" switch to the profile, shown on the home page and checkout, so customers aren't surprised on holidays.
