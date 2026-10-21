---
id: web-push
title: Web Push (phone notifications)
prefix: PSH
kind: integration
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/push/**
  - client/src/lib/push.ts
  - client/src/components/PushSync.tsx
  - client/src/components/PushToggle.tsx
  - client/public/sw.js
relations:
  - extends notifications — delivers the same events as OS-level notifications
---
Service-worker-based Web Push. It needs a VAPID keypair; without one the
feature is hidden and everything else works. Users opt in from Profile →
Phone notifications, and are prompted automatically after signing in.
Subscriptions are stored per device and pruned when they expire.

## Rules
- **R-PSH-001** [must] If `VAPID_*` is unset, push is hidden and nothing else breaks.
- **R-PSH-002** [must] `/push/public-key` is public and must be mounted before the blanket-auth routers (R-PLT-002).
- **R-PSH-003** [should] Expired endpoints (404/410) are deleted on send.

## Decisions
- **D-PSH-001** [confirmed 2026-09-20] Add Web Push and auto-prompt after sign-in.
  Why: customers miss in-app notifications when the site is closed.

## Ideas
- **I-PSH-001** [new · impact:med · effort:S] Prompt for push at the moment it is most valuable, right after an order is placed ("Get notified when it's on the way?"), instead of at sign-in.
