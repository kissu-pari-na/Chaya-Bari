# Vault protocol: how an AI agent works on this project

This protocol is binding. It is also recorded as rules on the
[`knowledge-vault`](nodes/knowledge-vault.md) node (R-KV-001 … R-KV-008), so it
can only be changed the way any other rule is changed: by asking the user.

## 1. Orient (before writing any code)

1. Run `node vault/tools/vault.mjs brief`. It lists items waiting on the user,
   stale nodes and top ideas.
2. Find the nodes your task touches:
   - `node vault/tools/vault.mjs rules <file> [<file>…]` prints every rule
     that governs those files, the neighbouring rules to watch, and anything
     unresolved on those nodes.
   - `node vault/tools/vault.mjs impact <node-id>` shows what else a change to
     that feature can break.
3. Read the full node files for the features you will change. For any visual
   work also read [`/design.md`](../design.md), the source of truth for the
   `design-system` node.

## 2. Check for conflicts

A conflict exists when the requested change, or something you are about to do
on your own initiative, would:

- break a `[must]` rule, or depart from a `[should]` rule without a good reason;
- contradict a `confirmed` decision;
- answer an `open` question, or lock in a `proposed` decision, without the user;
- create a contradiction between two rules (yours or existing ones).

**When there is a conflict, stop and ask the user before acting.** Quote the
rule or decision id, say what the request would change, and offer the options,
with your recommendation first. Do not resolve it silently. Do not work around
it either: copying logic to dodge a rule is still breaking the rule.

If the user is unreachable (an autonomous run), do the part that conflicts with
nothing. For the rest, record a `proposed` decision or an `open` question and
report it.

## 3. Record (part of the same change, not a follow-up)

| What happened | What to write | Where |
|---|---|---|
| The user clarified a conflict | `D-…` `[confirmed YYYY-MM-DD]` with *Why*, and mark the question `answered → D-…` | the node the rule belongs to |
| You made a judgement call the user hasn't seen | `D-…` `[proposed YYYY-MM-DD]` | the affected node |
| A rule changed | Edit the rule text, and add a decision that says what changed and why. Never delete a rule silently; to retire one, change it to `[should]` with a note or remove it *and* log the removal as a decision | the node |
| A new invariant exists in code | `R-…` `[must]` or `[should]` | the node that owns it |
| You could not decide something | `Q-…` `[open YYYY-MM-DD]` with the options | the node |
| You noticed a UX or product improvement | `I-…` `[new · impact:… · effort:…]` | the node |
| A feature was added | A new node file, with edges to every feature it touches | `vault/nodes/` |
| You re-read a node's code and it is accurate | Bump `reviewed:` to today | frontmatter |

Get the next free id with `node vault/tools/vault.mjs next-id <node> <R|D|Q|I>`.
Never reuse or renumber an id. Other entries and commits refer to them.

## 4. Verify

```bash
node vault/tools/vault.mjs check
node vault/tools/vault.mjs build
```

`check` must report 0 errors. `build` regenerates `INDEX.md`, `graph.json`
and `graph.html`, so commit them with the node edits.

## 5. Improve the vault (self-improvement loop)

At the end of every task:

1. Run `node vault/tools/vault.mjs suggest` and act on at least one prompt that
   relates to what you touched. It flags nodes without ideas, hub nodes with
   too few rules, nodes with no decisions, stale nodes, and pairs of features
   that interact without a designed joint experience.
2. Add at least one idea (`I-…`) when you saw something that would make the
   customer's, kitchen's or owner's experience better. Ideas are cheap to
   record; the user decides which to build.
3. When an idea ships, set it to `[done …]` and add the decision that came with
   it. When the user rejects one, set it to `[rejected …]` with the reason so it
   is not proposed again.

## Entry format (quick reference)

```markdown
## Rules
- **R-ORD-001** [must] One sentence, testable. _Source:_ where it is enforced.

## Decisions
- **D-ORD-001** [confirmed 2026-09-19] What was decided.
  Why: the reason. Supersedes: D-ORD-000 (optional)

## Open questions
- **Q-ORD-001** [open 2026-10-21] The question?
  Options: (a) … (recommended) · (b) …

## Ideas
- **I-ORD-001** [new · impact:high · effort:S] The idea and who it helps.
```

Decision statuses: `confirmed` (the user decided, or it is shipped behaviour
the user accepted), `proposed` (an AI judgement call awaiting the user), and
`superseded` (replaced; name the replacement with `by:D-…`).
