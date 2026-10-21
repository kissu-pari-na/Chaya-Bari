---
id: scheduled-jobs
title: Scheduled housekeeping
prefix: OPS
kind: cross-cutting
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/maintenance/**
  - server/src/modules/reviews/review-invite.service.ts
relations:
  - triggers reviews — sends day-after review invites
  - triggers notifications — the review invite is a notification
---
Periodic jobs that are safe to repeat: sending review invites, deleting
legacy never-confirmed self-registered accounts (R-AUTH-005), and pruning expired rate-limit rows. Vercel Cron
calls `/api/internal/*` with `CRON_SECRET`, and a persistent host runs them on
a boot interval.

## Rules
- **R-OPS-001** [must] Every job is idempotent and safe to run repeatedly.
- **R-OPS-002** [must] The internal endpoint is disabled entirely when `CRON_SECRET` is unset, so it can never be triggered publicly.

## Decisions
- **D-OPS-001** [confirmed 2026-09-15] Run housekeeping through a secret-protected cron endpoint.
  Why: serverless hosting has no long-running process.

## Ideas
- **I-OPS-001** [new · impact:low · effort:S] Add a "tomorrow's orders" morning summary job for the kitchen, as a push or email at 07:00.
