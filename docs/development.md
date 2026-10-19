# Development guide

## Prerequisites

- Node.js 22
- pnpm 11 through Corepack or a compatible global installation
- Git

No hosted account is required for the foundation lot.

## Install and run

```bash
pnpm install
pnpm dev
```

The root development command starts the web workspace. Backend and mobile
commands will be added only when their respective lots create executable apps.

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
