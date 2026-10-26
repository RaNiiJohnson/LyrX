# Lot 7 quota checkpoint — 26 October 2026

## Latest stop — supersedes the first checkpoint below

The user explicitly asked **“sauvegarde et on continue après”** after supplying
eight new visual comments. All three active UI agents were interrupted; no new
visual-feedback implementation has been saved yet. Do not close lot 7 or prepare
its PR before completing these additions. Branch/base remain
`codex/public-discovery-layouts` / `9f83883`. Previous remote WIP was `4609f8a`.

### Work completed since the first pause

- Backend type errors fixed. 83 backend tests pass, including large inheritance
  fan-out, rate limits/retry, bounded expiry and source-view cleanup. Large album
  changes defer discovery positions to durable owner jobs. Album discovery cards
  omit the optional track count to avoid reading every track's full lyrics.
- Development `convex dev --once` succeeded; discovery backfill now ran and is
  complete: `initialized:true,pendingJobs:0`, no jobs. Live anonymous queries:
  three public Fan contributions, zero public official songs/albums, one artist.
- Root **`pnpm check` PASSED** at this stop: format, lint, TypeScript, **339 tests**
  (29 shared + 83 backend + 227 web), client/SSR builds. Expected Happy DOM
  blocked-iframe diagnostics test fallback, not successful provider playback.
  Log: `/tmp/lyrx-lot7-final-check.log` (not a committed source artifact).
- Primary reviewed the entire implemented diff from `9f83883` locally and used
  Convex reviewer before the latest visual feedback. That review found/fixed the
  album read fan-out, narrow sidebar-field layout, image replacement state and
  stale horizontal arrows. Repeat review of all subsequently changed files.
- Removed the user's rejected “L’essentiel du morceau” heading/introduction and
  duplicate identity legend. Single/Album is a ToggleGroup; desktop optional
  fields/artwork/actions are a right column, mobile remains normal flow.
- New tests cover lyric insertion, native edit/caret, telemetry, artwork, Studio,
  real Radix/router filters, profile banner replacement and player fallback.
- Chrome native Ctrl+Z and selection replacement verified without saving a draft.
  Desktop 1280×900, mobile390×844, FR/dark and EN/light, Fan/Artist/admin navigation,
  live lists/filter/empty/profile/attribution/legacy redirect checked. Mobile
  actions clear the bottom navigation; desktop footer is static at viewport end.
  No browser warnings/errors on the test tab. Details in `lot7-verification.md`:
  this is an **intermediate** record, not final acceptance of the new comments.

### New user comments still to implement (do not forget)

1. Remove duplicate local Songs/Albums/Artists navigation below catalogue title;
   it repeats the header. Keep destinations reachable on mobile via the sidebar.
2. Catalogue headers/filters should follow `design/Voir tout – Morceaux@2x.png`,
   its mobile version, and equivalent Albums/Artists mockups: clearer compact
   title/count/filter hierarchy, not the current tall stack of labels/controls.
   Keep real origin/genre/sort/page URL behavior and reset-on-filter.
3. Replace the dense account dropdown with a **simple shadcn sidebar** (offcanvas
   panel), spaced sections with genuinely different hierarchy. Improve spacing
   among locale/theme/account controls. Preserve auth/role/admin navigation,
   keyboard focus/close, mobile safe-area navigation and normal-flow footer.
4. Minimalist artwork upload for **all** song/album/Fan forms, closer to the
   design's outlined upload tile. Remove big duplicated Card labels/native file
   control prominence. Keep real upload, constraints, pending/error/retry/clear,
   keyboard access and compact 96/160px previews; no fake drag/drop behavior.
5. Add **Intro and Outro** optional heading buttons in **French and English**
   for Artist and Fan lyric editors. Preserve native insertion/undo/caret/max.
6. Fix profile avatar: the Fan screenshot shows a stretched horizontal capsule,
   not a circular avatar. Inspect Field descendant CSS vs Avatar width/shrink;
   follow `design/Modifier le profil@2x.png` for the upload control. Preserve
   profile values, image pipeline, Artist banner and account deletion access.

User clarified: references may be adapted when genuinely better, but existing
designs often look better; follow them more closely without changing theme.

### Paused ownership / resumption

- `lot7_sidebar`: shell/tests + new sidebar-related app files/UI primitive only.
- `lot7_web_finish`: catalogue header/filter layout and discovery tests only.
- `lot7_editor_tests`: shared ArtworkCard/tests + private ProfileEditor/tests.
- Primary: Intro/Outro, any Fan layout integration, docs, browser and mandatory
  final local review. Agent noted toolbar disabled state reads textarea.ref during
  render: pending transition may leave buttons visually enabled one render,
  although click guard prevents editing; pass explicit disabled prop and test.
- No new agent edits from this visual pass were present at stop. Check status
  before resuming, re-read shadcn skill/required docs, coordinate ownership.
- Re-run root checks/browser/review after feedback, update progress/verification,
  commit and push; standing workflow stops at English PR description in Chrome.
  Never click Create pull request. No lot 8, production, role/account deletion.

Browser test Chrome tab is temporary and can close. Original user IAB tab is
being used by the user; do not overwrite their current page. Restore test-only
Chrome viewport/locale/theme before ending when possible. No live publication,
profile save, account deletion or role change was performed.

## Historical first pause (resolved technical failures)

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
