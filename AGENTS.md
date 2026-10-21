# Instructions for AI coding agents

Read and follow [`CLAUDE.md`](CLAUDE.md). It applies to every AI tool, not only
Claude.

In short: this project keeps a **knowledge vault** in [`vault/`](vault/README.md),
a graph of features whose nodes hold the project's rules, decisions, open
questions and ideas. Before changing code, run
`node vault/tools/vault.mjs brief` and `node vault/tools/vault.mjs rules <files>`.
Ask the user before breaking a rule or contradicting a decision. Record what you
learn back into the vault, following [`vault/PROTOCOL.md`](vault/PROTOCOL.md).
UI work follows [`design.md`](design.md).
