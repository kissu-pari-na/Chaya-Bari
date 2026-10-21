---
id: user-management
title: User management (admin)
prefix: USR
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/users/**
  - client/src/pages/admin/UsersAdmin.tsx
  - client/src/lib/users.ts
relations:
  - extends access-control — the only way to create ADMIN and KITCHEN accounts after seeding
  - uses email — tells created users to sign in with the Google account for their email
---
Admins create staff and customer accounts by **Google email**. There is no
password: the person signs in with Google, and that first sign-in confirms the
account. Each account records the admin who created it (a "creator footprint").
The user list shows each account's role, whether its owner has signed in yet,
and its placeholder state.

## Rules
- **R-USR-001** [must] Every admin-created account records `createdById`.
- **R-USR-002** [must] Admin-created accounts have no password. The new user is emailed to sign in with the Google account for that email, so the admin must enter a Google (Gmail or Workspace) address.

## Decisions
- **D-USR-001** [superseded 2026-09-15 by:D-USR-002] Stop emailing admin-set passwords. Send a set-your-own-password invite instead.
  Why: a password in an inbox is a security risk.
- **D-USR-002** [confirmed 2026-10-21] Remove the password from admin user creation. The created user signs in with Google (part of D-AUTH-004).
  Why: sign-in is Google only.

## Ideas
- **I-USR-001** [new · impact:low · effort:S] Let an admin deactivate (`isActive = false`) a staff account from the list, with a confirmation step, instead of having to change credentials when a staff member leaves.
