# Lyr'X repository guide

Read [docs/product.md](docs/product.md),
[docs/specification.md](docs/specification.md),
[docs/architecture.md](docs/architecture.md), and
[docs/progress.md](docs/progress.md) before changing product code.

## Working rules

- Deliver one roadmap lot at a time; do not start the next lot before approval.
- Before closing any lot, follow the mandatory local-review gate in
  [.agents/rules/lot-completion.md](.agents/rules/lot-completion.md).
- Run the checks listed in [docs/development.md](docs/development.md) before handoff.
- Keep server authorization in Convex functions; UI visibility is not access control.
- Never commit secrets or claim an external integration was verified without evidence.
- Never use `rm -rf`; move unwanted files to Trash with `trash`.
- Preserve unrelated user and agent changes.
- Use sub-agents when useful, with explicit ownership and coordinated edits;
  the mandatory lot-completion review remains the primary agent's responsibility.

For work under `packages/backend/convex/`, read the current Convex project
guidelines before editing functions or schemas.
