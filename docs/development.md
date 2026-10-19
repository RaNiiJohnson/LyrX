# Development guide

## Prerequisites

- Node.js 22
- pnpm 11 through Corepack or a compatible global installation
- Git

A hosted account is not required for the automated checks. Trying live account
flows requires a Convex development deployment and provider configuration as
described in [authentication.md](authentication.md).

## Install and run

```bash
pnpm install
pnpm dev
```

The root development command starts the web workspace. In a second terminal,
start Convex after selecting a development deployment:

```bash
pnpm --filter @lyrx/backend dev
```

Without the three public `VITE_` values, the web app deliberately renders a
configuration notice and does not simulate an auth backend.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

`pnpm check` is the handoff gate and runs the non-destructive automated checks.
For interface lots, supplement it with browser checks at desktop and mobile
widths. Backend and mobile lots add deployment- or device-specific evidence.

Backend-specific commands:

```bash
pnpm --filter @lyrx/backend auth:schema
pnpm --filter @lyrx/backend convex:codegen
```

The first command regenerates the repository-owned Better Auth schema. The
second requires a configured Convex deployment and replaces the documented
bootstrap generated types.

## Environment policy

Copy a package's `.env.example` only when that package documents the values it
uses. Keep real secrets in ignored local files or provider-managed environment
variables. Never prefix server-only secrets with a client-exposed environment
namespace.

## Delivery workflow

Work from one branch per roadmap lot. Update [progress.md](progress.md) with the
checks actually run, known issues, and next mission. Prepare a local commit and a
PR proposal, but do not push, open a PR, merge, deploy, or publish without the
user's explicit authorization for that action.
