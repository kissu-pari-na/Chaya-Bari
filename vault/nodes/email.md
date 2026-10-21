---
id: email
title: Transactional email
prefix: EML
kind: integration
status: live
reviewed: 2026-10-21
code:
  - server/src/lib/mailer.ts
  - server/src/lib/emailLogo.ts
relations:
  - uses business-profile — brand name and logo in mail
---
Branded HTML plus plain-text email over SMTP. It covers the "your account is
ready, sign in with Google" mail for admin-created accounts, order-confirmed
mail with the tracking link, and review invites. Since D-AUTH-004 there are no
confirmation-code or password emails. The templates live in
`server/src/modules/auth/account-email.service.ts`. Without SMTP credentials the
mailer runs in log-only mode.

## Rules
- **R-EML-001** [must] Every email has a plain-text body. HTML is optional.
- **R-EML-002** [must] Non-essential mail (for example review invites) carries a `List-Unsubscribe` header. All mail sets Reply-To.
- **R-EML-003** [must] A mail failure never breaks the business action that triggered it.
- **R-EML-004** [should] The inline logo is small (as reduced in commit 840fb1d) to keep messages light and out of spam folders.

## Decisions
- **D-EML-001** [confirmed 2026-10-06] Improve deliverability with a smaller logo, Reply-To and List-Unsubscribe (commit 840fb1d).
  Why: mail was landing in spam.

## Ideas
- **I-EML-001** [new · impact:low · effort:S] Send a "your food is on the way" email at OUT_FOR_DELIVERY for customers without push enabled.
