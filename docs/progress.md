# Delivery progress

## Active lot

**Lot 3 was reopened on 2026-10-21 for a user-directed landing image and
typography correction. Its final corrective review is in progress. Do not begin
lot 4 until the gate is clean and the user approves the next lot.**

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
- [x] Lot 2 `pnpm check` passes formatting, lint, TypeScript, 21 tests, and all
      production builds.
- [x] The mandatory Convex review found one cross-account profile-image
      ownership vulnerability. Upload intents, persisted image ownership,
      attachment indexes, and a cross-account regression test now prevent a
      member from attaching or deleting another member's image. The real Convex
      schema push succeeds.
- [x] Verify the corrected authenticated header and sign-in/sign-up redirects,
      the account-loading skeleton, and affected desktop/mobile layouts. Chrome
      with the existing authenticated account redirected both public auth routes
      to `/profile`, showed only profile/sign-out actions, had no console error,
      and had no horizontal overflow at 390×844. A separate anonymous session
      visibly transitioned from the targeted account skeleton to the sign-in
      form and also had no horizontal overflow at 390×844. Sonner success/error
      calls are wired to asynchronous actions and passed typecheck/build; no
      profile or auth mutation was performed merely to manufacture a toast.
- [x] Run `pnpm check` for the corrective diff and repeat the mandatory
      completion review against `097e3ff...HEAD`.
- [x] Record the live authenticated session evidence available in Chrome. Google
      consent return, delivered email, reset/verification links, and live uploads
      were not repeated in this pass; that remaining external evidence stays
      explicit instead of becoming a manual account-linking UI requirement.
- [x] The no-backend state was inspected in Chrome desktop and a narrow in-app
      viewport; navigation is responsive, the limitation is explicit, and the
      browser console has no warning or error.
- [x] The auth proxy returns a structured HTTP 503 when deployment configuration
      is absent, and the production client bundle contains no explicit Node or
      TanStack server-module import.
- [x] Lot 3 `pnpm check` passes formatting, lint, TypeScript, 38 tests, and all
      production builds after the corrective review.
- [x] Chrome verifies the Corail shell in system, light, and dark modes and the
      French/English switch. Both preferences survive a reload, the HTML `lang`
      value follows the locale, and the browser console reports no warning or
      error.
- [x] Desktop and 390×844 layouts were inspected. The mobile shell has no
      horizontal overflow (`scrollWidth === innerWidth === 390`), exposes a
      labelled menu, and closes with Escape while returning focus to its
      trigger.
- [x] The final Standards re-review reports 0 hard violations and 0 judgement
      calls. The final Spec re-review reports 0 implementation defects and 0
      scope-creep findings. The final `pnpm check` is clean.

## Lot history

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

### Lot 2 — Backend, auth, roles, and profiles (complete)

Implemented locally on 2026-10-19 on `feat/backend-auth-profiles`.

- Repository-owned Better Auth component with generated schema, Convex HTTP
  routes, TanStack Start proxy/provider wiring, and exact compatible dependency
  pins (`@convex-dev/better-auth@0.12.5`, `better-auth@1.6.33`).
- Email/password registration, verification and reset callbacks, conditional
  Google sign-in, Better Auth automatic trusted-provider linking, sign-out, and
  truthful capability states when external providers are absent.
- Verified-email onboarding into immutable Fan or Artist roles; separate
  administrator flag with single-use internal bootstrap; active/suspended
  server authorization.
- Unique public handles, editable fan/artist profiles, allowlisted social and
  custom links, public projections, avatar/banner Convex storage with type/size
  validation and replacement cleanup.
- shadcn-based account, onboarding, profile, loading, empty, error, unavailable,
  and suspension states. The TweakCN Caffeine tokens are the installed baseline;
  the deeper Lyr’X visual pass remains reserved for lot 3.
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

### Lot 2 mandatory review — 2026-10-20

The `code-review` Standards and Spec axes and `convex:convex-reviewer` ran on
`097e3ff...HEAD`, the complete diff since the final lot 1 commit.

- The blocking storage finding was corrected by binding each upload intent and
  stored profile image to its authenticated member. The Resend webhook secret is
  now also part of the typed Convex deployment contract.
- The corrective re-review additionally required ownership-gated replacement
  cleanup. Upload intents now expire after ten minutes, are deleted by a
  scheduled internal mutation, and are limited to five per member per window by
  the official Convex Rate Limiter component. A submitted storage object must
  have been created during the intent lifetime; unowned rejected objects are
  preserved rather than deleted from a client-supplied identifier.
- The final Standards re-review reports no implementation-blocking finding. The
  final Convex re-review reports 0 Critical and 0 Important findings; its
  lifecycle-test suggestion was then closed with explicit pre-intent rejection
  and scheduled-expiry tests.
- That review recorded missing real-path authentication evidence separately from
  implementation findings. The later account-UX corrective pass must now repeat
  the final code review; external checks that cannot be performed stay disclosed
  rather than becoming artificial blocking requirements.
- One non-blocking structure suggestion remains accepted for now: the two
  profile forms repeat small field validators. Extracting them before the deeper
  visual work would create a temporary interface that lot 3 is expected to
  reshape; reassess it while composing the lot 3 forms.

### Lot 2 corrective final review — 2026-10-20

- The Standards and Spec axes re-ran on `097e3ff...HEAD`. Their initial findings
  identified an overclaimed toast verification and hard-coded post-auth routing
  to onboarding. The evidence wording now distinguishes observed browser states
  from typecheck/build evidence, and `/account` routes each live member state to
  verification, onboarding, profile, suspension, or sign-in as appropriate.
- The final Standards re-review reports no hard violation. The final Spec
  re-review reports no remaining or new finding.
- The final Convex review remains at 0 Critical and 0 Important. The corrective
  commits do not touch `packages/backend/convex/`. Its unused
  `profileImages.by_member_id_and_kind` index suggestion is accepted as
  non-blocking pending the next image-management operation.
- Two non-blocking code-structure judgement calls remain: the email action forms
  duplicate a small layout/state pattern, and `profile-editor.tsx` still combines
  profile fields with image-upload concerns. Reassess these seams during the
  deeper account UI composition instead of introducing temporary interfaces at
  this gate.
- `pnpm check` passes formatting, lint, TypeScript, 21 tests, and production
  client/SSR builds. Authenticated and anonymous browser checks cover the account
  resolver, auth-route guards, header state, targeted skeleton transition,
  keyboard focus, console state, and 390×844 overflow.

### Lot 3 — Corail shell, theme, and i18n (complete)

Implemented on `feat/corail-shell-theme-i18n`.

- Reconciled the TweakCN Caffeine baseline with semantic Corail studio tokens:
  exact brand coral, warm light and night surfaces, accessible interactive
  primary pairs, selection colors, and complete light/dark semantic surfaces.
- Added the responsive shadcn/Radix shell, desktop and mobile account navigation,
  semantic loading states, and an editorial landing composition that does not
  claim future catalogue capabilities are already available.
- Added `next-themes` light/dark/system preferences under the `lyrx-theme`
  storage key and a French-first shared message catalogue with remembered
  French/English switching under `lyrx-locale`. Existing auth, onboarding,
  profile, loading, validation, and toast UI now follows that locale.
- The initial Standards review found duplicated SSR metadata ownership and a
  missing semantic foreground for the exact coral logo mark. The initial Spec
  review additionally found raw provider/server error details could escape in
  the wrong language. Corrections now source SSR metadata from the shared
  catalogue, add an accessible `brand-foreground` pair, and normalize stable
  Better Auth/Convex error codes into localized messages while hiding unknown
  provider text behind a translated fallback.
- The previous profile-validation duplication was closed with shared portable
  handle/display-name predicates and regression tests. The browser-side handle
  rule now matches the server’s normalized boundary rule instead of accepting
  leading or trailing punctuation that Convex would later reject.
- Lot 3 changes no file under `packages/backend/convex/`; the required Convex
  review is therefore not applicable under the completion rule rather than
  producing invented backend findings.
- The corrective Standards re-review reports 0 hard violations and 0 judgement
  calls. The corrective Spec re-review reports 0 implementation defects and 0
  scope-creep findings. Chrome supplied the available browser evidence; other
  browser engines were not available in this environment and are not claimed as
  verified.
- The final `pnpm check` passes formatting, lint, TypeScript, 38 tests, and all
  production client and SSR builds.

### Lot 3 visual correction — 2026-10-21

- Replaced the landing hero's decorative blurred color treatment with a locally
  served AI-generated editorial studio photograph. The optimized WebP is 124 KB,
  has localized alternative text, and contains no product promise or readable
  embedded copy.
- Adopted the user-selected TweakCN Soft Pop tokens while retaining the exact
  coral Lyr'X brand mark. DM Sans Variable and Space Mono are self-hosted through
  Fontsource so the selected typography does not depend on a visitor's system
  fonts.
- Browser verification confirms the image loads at its intrinsic width, the
  computed body family is DM Sans Variable, no rendered element uses a CSS
  gradient, the post-reload console is clean, and the 390×844 layout has no
  horizontal overflow.
- `pnpm check` passes formatting, lint, TypeScript, 38 tests, and all production
  client and SSR builds. The corrective Standards and Spec reviews remain to be
  recorded before this reopened lot is closed again.

## Known external prerequisites

Hosting/domain, EAS, and Android signing configuration have not been supplied.
Google consent return and real email delivery/reset/verification remain recorded
as unverified live integrations; they did not produce a code-review blocker.

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

Do not begin without user approval. Lot 4 introduces artist catalogue and album
workflows after Lot 3's completed review gate.
