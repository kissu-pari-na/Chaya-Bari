---
id: auth
title: Accounts & sign-in (Google only)
prefix: AUTH
kind: feature
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/auth/**
  - server/src/lib/googleAuth.ts
  - server/src/utils/jwt.ts
  - server/src/utils/password.ts
  - server/src/middleware/rateLimit.ts
  - server/src/lib/rateLimit.ts
  - server/prisma/seed.ts
  - client/src/context/AuthContext.tsx
  - client/src/pages/Login.tsx
  - client/src/pages/Profile.tsx
  - client/src/pages/Auth.css
  - client/src/components/GoogleSignInButton.tsx
  - client/src/components/PhoneNoticeBanner.tsx
relations:
  - uses email — the "your account is ready, sign in with Google" mail for admin-created accounts
  - triggers scheduled-jobs — legacy never-confirmed self-registered accounts are cleaned up
  - extends access-control — issues the JWT that carries the role
---
Everyone (customers, admin and kitchen) signs in with **Google only**. The
first Google sign-in creates a customer account. A Google sign-in for an
email that already has an account (a seeded or admin-created staff member, an
older password account, or a placeholder an admin ordered for) logs into that
account. There are no passwords, email codes or password resets. A missing
phone number is asked for at checkout. Sessions are JWT bearer tokens, and
guests can still order without any account.

## Rules
- **R-AUTH-001** [must] Sign-in is Google only, for every role. There are no register, password-login, email-code or password-reset endpoints or pages. Re-adding any of them needs the owner's decision.
- **R-AUTH-002** [must] A placeholder account is never deleted. A Google sign-in for its email takes it over with all its orders, and clears `isPlaceholder`.
- **R-AUTH-003** [must] A Google sign-in for an existing email logs into that account without changing its role, and confirms it (`emailVerifiedAt`) if it was unconfirmed. A new email creates a confirmed CUSTOMER immediately and claims guest orders placed with that email.
- **R-AUTH-004** [must] `POST /api/auth/google` is throttled per IP (30 per 5 minutes), fail-open. Google accounts whose email Google hasn't verified are refused.
- **R-AUTH-005** [must] The cleanup job deletes only legacy *self-registered* accounts that never confirmed (`createdById` null). It never deletes admin-created accounts, which stay unconfirmed until their owner's first Google sign-in, and never deletes placeholders.
- **R-AUTH-006** [should] Phone number is optional on the account but is collected before delivery: a storefront banner and a checkout field prompt for a missing number.
- **R-AUTH-007** [must] Sign-in requires `GOOGLE_CLIENT_ID` (server) and `VITE_GOOGLE_CLIENT_ID` (client), set to the same OAuth client. Without them the sign-in page explains it isn't set up, and guest checkout keeps working.

## Decisions
- **D-AUTH-001** [superseded 2026-09-15 by:D-AUTH-004] Switch account confirmation from SMS to email.
  Why: SMS cost and delivery problems.
- **D-AUTH-002** [confirmed 2026-09-16] Add Google Sign-In.
  Why: one-tap sign-up removes the email-code round trip, which is the biggest drop-off point.
- **D-AUTH-003** [superseded 2026-09-15 by:D-AUTH-004] Delete never-confirmed accounts after a time window.
  Why: they have no proven owner and would otherwise block real owners.
- **D-AUTH-004** [confirmed 2026-10-21] **Google-only sign-in** for customers and staff, chosen by the owner to keep the site simple:
  Staff: admin and kitchen sign in with Google too. Seeded staff come from `SEED_ADMIN_EMAIL` and `SEED_KITCHEN_EMAIL`, and admins add more staff by their Google email.
  Old accounts: a password account reaches its data by signing in with Google on the same email. Accounts on a non-Google email can no longer sign in.
  Backend: the register, password-login, verify-email, resend-email, forgot-password and reset-password endpoints and pages were removed. The old links redirect to `/login`.
  Guests: guest checkout stays. The phone number is asked for at checkout when missing.
  Rules changed: R-AUTH-001 to R-AUTH-005 were rewritten for Google-only, and R-AUTH-007 was added. R-USR-002 and R-ACL-002 were updated, and D-USR-002 was added. The cleanup job is now limited to legacy self-registered rows, because admin-created accounts now stay unconfirmed until the first Google sign-in.
  Why: one login method, no passwords to forget or reset, no confirmation emails, and fewer screens and endpoints. Google proves the email, so accounts are verified by construction.

## Open questions
- **Q-AUTH-001** [answered 2026-10-21 → D-AUTH-004] The `User` model comment in `schema.prisma` said "Phone confirmation is mandatory; email optional". It was corrected for Google-only sign-in.

## Ideas
- **I-AUTH-001** [rejected 2026-10-21 · impact:high · effort:M] Passwordless "email me a sign-in code" login.
  Rejected: the owner chose Google-only sign-in (D-AUTH-004).
- **I-AUTH-002** [new · impact:low · effort:S] Clean up the legacy schema with a migration: drop the unused `VerificationCode` table and the `VerificationChannel` enum, and make `User.passwordHash` and `phoneVerifiedAt` nullable (or drop them). Nothing reads them since D-AUTH-004.
- **I-AUTH-003** [new · impact:med · effort:S] Show Google One Tap (the small "Continue as …" prompt) on the cart page for signed-out visitors with items in the cart. Signing in there pre-fills checkout and unlocks tracking, with no extra page.
