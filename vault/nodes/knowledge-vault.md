---
id: knowledge-vault
title: Knowledge vault (this graph)
prefix: KV
kind: meta
status: live
scope: global
reviewed: 2026-10-21
code:
  - vault/**
  - CLAUDE.md
  - AGENTS.md
  - .claude/settings.json
relations:
  - constrains platform — every change to the project goes through the vault protocol
---
The project's long-term memory. Features are nodes, their relations are
edges, and rules, decisions, open questions and ideas live on the nodes. Every
AI agent reads it before changing code and writes back what it learned or was
told, so the vault gets more complete and consistent as the project grows.

## Rules
- **R-KV-001** [must] Before changing code, an agent runs `vault.mjs brief` and `vault.mjs rules <files>` for the files it will touch, and reads the affected node files.
- **R-KV-002** [must] If a change would break a `[must]` rule, contradict a `confirmed` decision, settle an `open` question, or create a contradiction between rules, the agent stops and asks the user, quoting the ids involved, before acting.
- **R-KV-003** [must] Every clarification the user gives is recorded as a `confirmed` decision on the node it concerns, in the same change. A judgement call the user has not seen is recorded as `proposed`.
- **R-KV-004** [must] Rules are never deleted or rewritten silently. Every change to a rule comes with a decision that says what changed and why.
- **R-KV-005** [must] Entry ids are permanent. Never reuse or renumber them. Get new ones with `vault.mjs next-id`.
- **R-KV-006** [must] A new feature gets its own node, with edges to every feature it touches, in the same change that adds the feature.
- **R-KV-007** [must] `vault.mjs check` reports 0 errors, and `vault.mjs build` has been run, before work is committed.
- **R-KV-008** [should] At the end of each task the agent runs `vault.mjs suggest`, acts on a relevant prompt, and records at least one improvement idea when it noticed one.
- **R-KV-009** [should] When an agent re-reads a node's code and confirms the node is accurate, it bumps `reviewed:` to that date.

## Decisions
- **D-KV-001** [confirmed 2026-10-21] Store the vault as Markdown node files with frontmatter edges under `vault/nodes/`, plus a zero-dependency Node CLI.
  Why: the user wants a graph of features that both people and AI can read and that grows with the project. Plain Markdown diffs well in PRs, opens in any editor or Obsidian, and needs no database or service.
- **D-KV-002** [confirmed 2026-10-21] Load the vault into every Claude Code session automatically. `CLAUDE.md` points to the protocol, and a SessionStart hook in `.claude/settings.json` prints `vault.mjs brief`. `AGENTS.md` does the same for other AI tools.
  Why: "AI will consider the knowledge vault" has to hold even when the prompt does not mention the vault.
- **D-KV-003** [confirmed 2026-10-21] Decisions that were already shipped through merged PRs before the vault existed are recorded as `confirmed`, dated by their commit or migration.
  Why: the owner merged them, so they reflect accepted behaviour. Anything the AI inferred without evidence is recorded as `proposed` or as a question instead.

## Ideas
- **I-KV-001** [new · impact:med · effort:S] Add a CI step (GitHub Action) that runs `vault.mjs check` on every PR, so a PR that edits a feature without updating its node is flagged.
- **I-KV-003** [new · impact:low · effort:S] Fix the schema drift that existed before the wallet work: the `PaymentMethod` enum's order and the `Order.customerId` foreign-key rule differ between the migrations and `schema.prisma`, which `prisma migrate diff` reports. Add a no-op alignment migration.
- **I-KV-002** [new · impact:med · effort:M] Have `vault.mjs stale` comment on PRs that change code under a node's `code` globs without touching that node file.
