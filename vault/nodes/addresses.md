---
id: addresses
title: Address book
prefix: ADR
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/orders/address.service.ts
  - client/src/components/AddressBook.tsx
  - client/src/components/AddressBook.css
  - server/prisma/scripts/orbitax-default-address.sql
relations:
  - feeds checkout — saved addresses auto-fill checkout
---
Customers manage saved addresses and pick a default. The phone on an address
is optional and is backfilled from the profile at checkout. Orbitax accounts
get their office address pre-filled.

## Rules
- **R-ADR-001** [must] Customers see and edit only their own addresses.
- **R-ADR-002** [must] Orders snapshot address fields (see R-CHK-003). Address edits never touch existing orders.

## Decisions
- **D-ADR-001** [confirmed 2026-09-16] Add an address book with checkout auto-fill and an Orbitax default address.
  Why: re-typing an address on every order was the main repeat-order friction.

## Ideas
- **I-ADR-001** [new · impact:low · effort:S] Let customers label addresses (Home / Office / Mum's) with an icon chip, so the right one is obvious at checkout.
