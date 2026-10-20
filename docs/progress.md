# Delivery progress

## Active lot

**None. Lot 2 is delivered locally and awaiting external configuration or user
approval for lot 3.**

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
- [x] Lot 2 `pnpm check` passes formatting, lint, TypeScript, 13 tests, and all
      production builds.
- [x] Convex-specific review found no unauthenticated public write, unindexed
      application query, missing function validator, or client-controlled admin
      promotion path.
- [x] The no-backend state was inspected in Chrome desktop and a narrow in-app
      viewport; navigation is responsive, the limitation is explicit, and the
      browser console has no warning or error.
- [x] The auth proxy returns a structured HTTP 503 when deployment configuration
      is absent, and the production client bundle contains no explicit Node or
      TanStack server-module import.

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

### Lot 2 — Backend, auth, roles, and profiles

Implemented locally on 2026-10-19 on `feat/backend-auth-profiles`.

- Repository-owned Better Auth component with generated schema, Convex HTTP
  routes, TanStack Start proxy/provider wiring, and exact compatible dependency
  pins (`@convex-dev/better-auth@0.12.5`, `better-auth@1.6.33`).
- Email/password registration, verification and reset callbacks, conditional
  Google sign-in, secure explicit Google linking, sign-out, and truthful
  capability states when external providers are absent.
- Verified-email onboarding into immutable Fan or Artist roles; separate
  administrator flag with single-use internal bootstrap; active/suspended
  server authorization.
- Unique public handles, editable fan/artist profiles, allowlisted social and
  custom links, public projections, avatar/banner Convex storage with type/size
  validation and replacement cleanup.
- shadcn-based account, onboarding, profile, loading, empty, error, unavailable,
  and suspension states. The Corail visual system remains reserved for lot 3.
- Automated Convex authorization/profile tests and local schema generation pass.
  Production web bundling passes without the reported TanStack server-module
  leakage.

The Convex cloud development project `johnsontolotriniavo/lyrx` is now created in
Europe (Ireland). The functions and local Better Auth component were pushed
successfully to `lovely-dolphin-50`; live queries prove the anonymous session and
provider capability states. Google and Resend credentials are configured. The
Google flow reaches the real consent screen, while final consent/return, actual
email delivery, reset/verification links, authenticated session cookies,
webhook events, and live storage uploads are not yet claimed as verified. See
[authentication.md](authentication.md).

`pnpm peers check` also reports Better Auth's optional Vitest peer range ending
at Vitest 4 while this workspace uses Vitest 5. The application and Better Auth
runtime do not consume that optional testing peer; the warning is kept visible
rather than suppressed, and all repository tests pass.

## Known external prerequisites

Hosting/domain, EAS, and Android signing configuration have not been supplied.
Google and email still need their final live account/delivery checks for lot 2.

## Deferred configuration checklist

- [ ] Rotate the Google OAuth client secret once, then keep the replacement only
      in the Convex dashboard. Never copy provider secrets into
      `apps/web/.env.local` or any `VITE_` variable.
- [ ] When Lyr’X owns its production email domain, verify that domain in Resend,
      add `EMAIL_FROM` to the Convex dashboard, and replace the temporary
      `Lyr’X <noreply@hallomada.de>` sender without changing application code.
- [ ] Register and verify all `email.*` events against
      `https://lovely-dolphin-50.eu-west-1.convex.site/resend-webhook`, then
      prove delivery, bounce, and complaint status in the Convex Resend
      component tables.
- [ ] Before production, change `SITE_URL` and the Google authorized callback
      from localhost to the final HTTPS origin and repeat the full OAuth return
      test.

## Next mission

Do not begin without user approval. Lot 3 introduces the Corail shell, complete
semantic design tokens, responsive navigation, French/English switching, and
light/dark/system preferences. It must build on the account states delivered by
lot 2 without weakening server authorization.
