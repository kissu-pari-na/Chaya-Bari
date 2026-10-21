---
id: ordering-window
title: Advance-order window & time slots
prefix: WIN
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/orders/ordering.service.ts
  - server/src/modules/orders/slots.ts
  - client/src/lib/slots.ts
  - client/src/pages/admin/OrderingSettingsAdmin.tsx
relations:
  - constrains checkout — earliest allowed date and open slots
  - feeds kitchen — orders are sorted by time slot on the board
---
Food is cooked to order, in advance. An admin sets the cutoff time (default
22:00), the minimum advance days (default 1), the default delivery charge
(default ৳60) and the timezone (Asia/Dhaka) in `OrderingSetting`. Two-hour
time slots run from 08:00 to 22:00. On weekdays (Sunday–Thursday) only the
12:00–14:00 slot is open; on Friday and Saturday every slot is open.

## Rules
- **R-WIN-001** [must] The server computes the earliest allowed fulfillment date from the cutoff, the minimum advance days and the business timezone, and rejects earlier orders.
- **R-WIN-002** [must] The cutoff, minimum advance days and delivery charge come from `OrderingSetting`. Never hard-code them.
- **R-WIN-003** [must] Customers on weekdays (Sun–Thu) can only pick 12:00–14:00. On weekends (Fri–Sat) all slots 08:00–22:00 are open. Slots are stored as "HH:MM-HH:MM".
- **R-WIN-004** [must] Admin orders placed on a customer's behalf ignore the cutoff and slot limits. Only past dates are rejected (see admin-orders).
- **R-WIN-005** [must] The slot list is mirrored in `client/src/lib/slots.ts`. Keep it in sync with the server.

## Decisions
- **D-WIN-001** [confirmed 2026-09-16] Add two-hour delivery slots, with only the noon slot on weekdays.
  Why: on workdays the family kitchen can only do a lunch run; weekends have full capacity.

## Ideas
- **I-WIN-001** [new · impact:med · effort:M] Make the weekday and weekend slot sets admin-editable (in `OrderingSetting`), so capacity changes don't need a deploy.
- **I-WIN-002** [new · impact:med · effort:M] Per-slot capacity: show a slot as full once N orders are booked into it.
