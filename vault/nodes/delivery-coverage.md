---
id: delivery-coverage
title: Delivery coverage areas
prefix: COV
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/orders/delivery-areas.ts
  - client/src/lib/deliveryAreas.ts
  - client/src/components/CoverageBanner.tsx
  - client/src/components/CoverageBanner.css
relations:
  - constrains checkout — out-of-coverage addresses are blocked
  - constrains addresses — the area is picked from a zone-grouped selector
  - extends orbitax-billing — Orbitax accounts may also order to their Mohakhali office
---
Orders are accepted only for serviceable areas, grouped into zones: Mirpur
12/DOHS, ECB Chattar/Matikata, Manikdi/Balughat and Baunia. The city is
locked to Dhaka. A closeable promo banner advertises the coverage, and the
contact page lists every zone.

## Rules
- **R-COV-001** [must] The server refuses any order whose area is outside coverage. The client warns early, but the server decides.
- **R-COV-002** [must] `server/src/modules/orders/delivery-areas.ts` is the single source of truth, and `client/src/lib/deliveryAreas.ts` mirrors it. Change both together.
- **R-COV-003** [must] Orbitax (`orbitax.com`) accounts may also order to the Mohakhali office area.

## Decisions
- **D-COV-001** [confirmed 2026-09-20] Restrict ordering to serviceable delivery areas, with the city locked to Dhaka.
  Why: deliveries outside these zones cost more than the delivery charge covers.

## Ideas
- **I-COV-001** [new · impact:med · effort:S] When an address is out of coverage, offer "Notify me when you deliver to <area>" and store the area. Those requests become demand data for choosing the next zone.
- **I-COV-002** [new · impact:low · effort:M] Move coverage zones to the database, editable by admins, which removes the client/server mirror (R-COV-002).
