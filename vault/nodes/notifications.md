---
id: notifications
title: In-app notifications
prefix: NTF
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/notifications/**
  - client/src/components/NotificationBell.tsx
  - client/src/components/NotificationBell.css
  - client/src/lib/notifications.ts
  - client/src/lib/notificationText.ts
relations:
  - uses web-push — the same events also go out as OS push
  - uses wallet — claim submitted / confirmed / rejected and adjustments
  - uses email — some events also send mail (confirmation, review invite)
  - constrains i18n — stored as message key + params so text follows the reader's language
---
Notifications are generated from real events: order placed (to the customer
and admins), status changes, wallet claims submitted (to admins), confirmed or
rejected (to the customer), admin wallet adjustments, and the review invite. A header
bell shows the unread count, a seven-item panel, mark-all-read and
clear-all. Clicking a notification opens its in-app link.

## Rules
- **R-NTF-001** [must] Notifications come only from real events in services, never from client-side guesses.
- **R-NTF-002** [must] Each notification stores a message key + params (plus a Bangla fallback title and body) and an optional in-app link.
- **R-NTF-003** [should] Copy is short, specific and actionable: the order number, the amount, and what happens next.

## Decisions
- **D-NTF-001** [confirmed 2026-09-20] Add a refund notification, and near-live polling updates for the bell and order pages.
  Why: customers didn't learn about refunds or status changes until they reloaded.

## Ideas
- **I-NTF-001** [new · impact:med · effort:S] Group notifications by order in the bell ("CB-1042 · 3 updates"), so busy days don't push older orders out of the seven-item panel.
