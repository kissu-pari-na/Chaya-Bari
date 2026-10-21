# ছায়া বাড়ি (Chaya Bari): instructions for AI agents

A management system for a small homemade-food business: React + Vite client
(`client/`), Express + Prisma API (`server/`), PostgreSQL. See `README.md`.

## The knowledge vault is mandatory

This project's rules, decisions, open questions and improvement ideas live in a
feature graph under [`vault/`](vault/README.md). **Follow [`vault/PROTOCOL.md`](vault/PROTOCOL.md) on every task:**

1. **Orient.** Run `node vault/tools/vault.mjs brief`, then
   `node vault/tools/vault.mjs rules <files you will touch>`, and read those nodes.
2. **Check for conflicts.** If the request, or anything you would do on your own,
   breaks a `[must]` rule, contradicts a `confirmed` decision, or settles an
   `open` question or `proposed` decision, **stop and ask the user first**.
   Quote the ids and offer options, with your recommendation first.
3. **Record.** Write the user's clarifications as `confirmed` decisions. Record
   your own judgement calls as `proposed`, new invariants as rules, and new
   features as new nodes with edges. Do this in the same change.
4. **Verify.** `node vault/tools/vault.mjs check` must report 0 errors. Then run
   `node vault/tools/vault.mjs build`.
5. **Improve.** Run `node vault/tools/vault.mjs suggest`, and add at least one
   `I-…` idea when you noticed something that would help customers, the kitchen
   or the owner.

## Design

All UI follows [`design.md`](design.md) (the Glossy Glass system; node
`design-system`). Never hard-code a colour. Use the tokens in
`client/src/styles/tokens.css`. Palettes are generated:
`cd client && npm run palettes`. Before finishing UI work run
`cd client && npm run check:design && npm run lint`.

## Conventions

- Every user-visible string is bilingual: `t('বাংলা', 'English')`. Bangla is the default.
- Money and business rules are computed on the server. The client only previews them.
- New backend features are modules in `server/src/modules/<name>/`, mounted in `server/src/routes.ts`. Public routers must be mounted before blanket-auth routers.
- Schema changes go through Prisma migrations.
