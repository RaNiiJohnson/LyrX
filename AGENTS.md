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

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
