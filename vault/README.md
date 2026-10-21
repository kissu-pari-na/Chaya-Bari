# Chaya Bari knowledge vault

The project's long-term memory, kept as a **graph**:

- **Nodes** are business features (ordering, payments, kitchen…) and
  cross-cutting concerns (i18n, design system, platform). Each one is a
  Markdown file in [`nodes/`](nodes/).
- **Edges** are the `relations` in each node's frontmatter, such as
  `depends-on payments — PREPAID orders are gated on full payment`.
- **Knowledge lives on the nodes**: rules (`R-`), decisions (`D-`), open
  questions (`Q-`) and improvement ideas (`I-`), each with a permanent id.

Humans and AI agents read the same files. AI agents must follow
[`PROTOCOL.md`](PROTOCOL.md): read the relevant rules before changing code,
ask the user when a change conflicts with a rule, and write every clarified
decision back here. The vault therefore grows more complete as the project
grows.

## Files

| Path | What |
|---|---|
| [`PROTOCOL.md`](PROTOCOL.md) | The binding workflow for AI agents |
| [`nodes/*.md`](nodes/) | One node per feature or concern. **Edit these.** |
| [`INDEX.md`](INDEX.md) | Generated overview: nodes, relation diagram, must-rules, pending questions, idea backlog |
| `graph.json` | Generated, machine-readable graph |
| `graph.html` | Generated interactive viewer. Open it in a browser. |
| [`tools/vault.mjs`](tools/vault.mjs) | Zero-dependency CLI (Node 18+) |

## Commands

```bash
node vault/tools/vault.mjs brief                 # what an agent should know right now
node vault/tools/vault.mjs rules client/src/pages/Checkout.tsx
node vault/tools/vault.mjs impact payments
node vault/tools/vault.mjs questions             # everything waiting on the owner
node vault/tools/vault.mjs ideas                 # improvement backlog, best value first
node vault/tools/vault.mjs suggest               # self-improvement prompts
node vault/tools/vault.mjs stale                 # nodes whose code changed after review
node vault/tools/vault.mjs check                 # integrity (0 errors required)
node vault/tools/vault.mjs build                 # regenerate INDEX.md / graph.json / graph.html
```

## Node file format

```markdown
---
id: payments                 # = file name, kebab-case
title: Payments
prefix: PAY                  # used in entry ids: R-PAY-001
kind: feature                # feature | cross-cutting | integration | meta
status: live                 # live | partial | mock | planned | deprecated
scope: local                 # "global" = its rules apply to every change
reviewed: 2026-10-21         # last time someone checked this against the code
code:                        # globs, used by `rules <path>` and `stale`
  - server/src/modules/payments/**
relations:                   # edges: <type> <node-id> — <why>
  - depends-on orders — a payment always belongs to one order
---
One-paragraph summary of what the feature does for the business.

## Rules
## Decisions
## Open questions
## Ideas
## Notes          (free text, optional)
```

Relation types: `depends-on`, `triggers`, `feeds`, `constrains`, `configures`,
`extends` and `uses`. Their meanings are listed in `graph.json`.

## Answering the owner's questions

`node vault/tools/vault.mjs questions` lists every open question and every
proposed decision. To answer one, tell the AI agent your decision. It records
it as a confirmed `D-` entry and marks the question answered.
