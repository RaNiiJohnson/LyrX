# Delivery progress

## Active lot

**None. Lot 1 is delivered locally and awaiting user direction.**

## Evidence checklist

- [x] `pnpm install --frozen-lockfile` succeeds from the committed lockfile.
- [x] `pnpm check` passes formatting, lint, TypeScript, 3 tests, and production
      builds for all 4 workspaces. The final run executed 16 cache misses after
      Turbo cache dependencies were corrected.
- [x] The TanStack Start shell returns HTTP 200 and was inspected in the browser
      at 1440×900 and 390×844. It is French, has no horizontal overflow, and
      shows no product capability as already implemented.
- [x] Two fresh reviewers completed independent product/UX and engineering
      reviews. Their two P2 findings were corrected and reverified.
- [x] The branch and commit state are recorded at handoff.

## Completed lots

### Lot 1 — Monorepo foundation and working documentation

Delivered on 2026-10-19 on `chore/foundation-monorepo`.

- pnpm/Turborepo workspace with `apps/web`, `packages/ui`, `packages/shared`,
  and the reserved `packages/backend` Convex boundary.
- Minimal server-rendered TanStack Start page, shadcn source component, portable
  shared product identifiers, strict TypeScript, lint, tests, and build gate.
- Official Convex AI files installed with `npx convex ai-files install`; no schema,
  server function, deployment, or authentication was introduced.
- Durable product specification, architecture, roadmap, development guide, and
  official integration research.
- Review corrections: preserved the complete cross-lot product decisions in
  `docs/specification.md`; made ESLint/TypeScript root configs invalidate Turbo
  cache; moved the page component out of the route to restore code splitting.

## Known external prerequisites

Convex, Google OAuth, transactional email, hosting/domain, EAS, and Android
signing configuration have not been supplied. They do not block lot 1.

## Next mission

Do not begin without user approval. Lot 2 will revalidate the published
`@convex-dev/better-auth` compatibility first, then introduce a real Convex
deployment path, Better Auth, roles, onboarding, profiles, server-only admin
bootstrap, and the corresponding authorization/session tests. Missing OAuth and
email credentials must remain explicit, unverified limitations.
