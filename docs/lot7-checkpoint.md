# Lot 7 quota checkpoint — 26 October 2026

STOP requested by user at 1% quota. Work is incomplete, all agents frozen.
Branch: `codex/public-discovery-layouts`, base `9f83883` (lot 6 PR #4 merged).
Commit `06deac9` records the user's newly approved roadmap/design documents.
Current implementation must be saved as WIP, not presented as completed.

## Implemented in shared files

- Backend `convex/discovery/{model,projection,maintenance,read,views}.ts`:
  unified Artist/Fan projection, Aggregate counts/numbered pages, genre/origin/
  artist filtering, bounded home and artist selections, lifecycle triggers,
  readiness gate during bounded owner refresh/backfill, durable recovery.
- Popular ranking uses verified member non-self views, deduplicated per source
  and UTC day over seven days; bounded expiry and account/source-view cleanup.
- Web home/catalogue/profile layouts, URL pages/sorts/filters, horizontal rows,
  source badges, missing-artwork fallback, unavailable search and legacy
  `/community` discovery redirect. Existing contribution detail/private routes stay.
- Shared responsive header/account menu/mobile bottom navigation with safe-area
  clearance, normal-flow desktop footer, signup/profile adaptations.
- Primary agent: Studio equal-width tabs/in-flow creation action, song artwork
  sidebar layout, shared optional lyric heading toolbar preserving native undo,
  public view recording component, shared pagination primitive and FR/EN keys.
  No theme token recoloring. Reference PNGs remain local/ignored in `design/`.

## Actual evidence / current failures

- Shell/auth/profile worker: 35 scoped tests pass, including deletion transitions.
- Discovery web worker: 16 scoped tests, web TypeScript and targeted lint passed
  before the latest backend edits; not proof of final integrated success.
- Backend: 79 tests passed BEFORE latest source-view cleanup additions. Latest
  development codegen uploaded functions and lint passed; TypeScript FAILS:
  - `discovery.test.ts:362/376`: `ids` needs `Array<Id<"songs">>` annotation.
  - `discovery/projection.ts:141`: indexed before/after elements possibly undefined.
    Use `.entries()` / `.at()` with an explicit missing replacement guard.
  - `discovery/read.ts:166/167`: count-array results possibly undefined; use
    `.at(0) ?? 0` and `.at(1) ?? 0` (not redundant indexed `??` rejected by lint).
- Full root gate and primary mandatory entire-diff/Convex review NOT completed.
- No lot 7 live-browser acceptance checks completed. No role/account changes,
  production deployment, PR creation or live test publication performed.
- Development backfill NOT invoked: discovery deliberately returns `ready:false`
  until `pnpm --filter @lyrx/backend migrate:discovery` runs after resumption.

## Resume in order

1. Read AGENTS, product/specification/architecture/progress, roadmap and
   design-guidance; use fixed base `9f83883` for final review, not just WIP commit.
2. Fix backend type errors; format latest files and run backend tests/lint/tsc.
   Add pending inheritance propagation, source-view cleanup, rate-limit and
   bounded expiry regressions. Inspect readiness/recovery/eligibility correctness.
3. Add primary-agent tests for `lib/lyric-heading.ts`,
   `lib/textarea-heading-tools.tsx` / app-form integration and
   `features/discovery/record-public-view.tsx`. Browser-prove heading insertion,
   caret, selection replacement and native undo; optional toolbar is hidden on
   engines without supported native `insertText`, preserving ordinary writing.
4. Review main changes in Studio/editor/artwork and integration mocks in community
   reader tests. Record-view failure must not block public reading; no preview views.
5. Check all worker code locally, especially readiness counts, mixed-origin ordering,
   hidden/deleted visibility, trigger fan-out/backfill/cascade, popularity expiry.
6. Run normal development push/backfill once stable (never production). Then check
   home/list/profile, numbered URLs/filter reset, origin attribution, real/missing
   artwork, empty/loading/error states, horizontal rows/desktop buttons, and
   member/anonymous/Artist/Fan/admin navigation in both locales/themes.
   Chrome has the user's Artist account; IAB has Fan. Never change their roles.
7. Check hero unavailable-search description contrast in LIGHT mode; worker noted
   possible muted text on image overlay. Improve actual Radix filter interaction
   and horizontal overflow/resize tests. Lyrics snippets are deliberately omitted
   rather than fabricated; backend card contract currently has no excerpt.
8. Complete primary local review + Convex reviewer skill, resolve hard findings,
   root `pnpm check`, update docs/progress with actual evidence and local commit.
   Standing user workflow: push branch, fill English Markdown PR description in
   Chrome, STOP BEFORE Create pull request. No lot 8 or production deployment.

## Ownership at pause (all edits frozen)

- Backend worker: all Convex/backend script changes and tests.
- Discovery worker: home, public profile, discovery UI/tests, songs/albums/artists
  list routes, `/artists/$handle`, legacy public Community redirect, generated routes.
- Shell worker: page-shell/tests, signup layout/form/tests, private profile editor/
  tests and profile/signup routes. Existing auth/deletion semantics preserved.
- Primary: shared i18n, UI pagination, Studio, song layout, lyric tooling, public
  view component and integrations, artwork fallback, documentation and final review.

No agent should resume edits without the user's resumption. Do not restart lot 5,
T1 or lot 6, which are merged and closed. Do not claim lot 7 complete.
