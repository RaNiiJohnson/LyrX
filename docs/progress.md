# Delivery progress

## Active lot

### Lot 8 — implemented and locally reviewed (27 October 2026)

Work is on `codex/lot8-public-search`, based on up-to-date `main` at `a6644da`
(after merged lots 5, T1, 6 and 7). The user's local documentation changes were
preserved in `231ce72`; removed design references were not restored. One standard
sub-agent researched Convex search read-only. The primary agent made all edits
and owns the full local review and delivery.

- Public Artist/Fan search uses one native relevance index, canonical source
  eligibility checks, visible Fan attribution and bounded matching lyric
  excerpts. The navbar opens an accessible shadcn Dialog. Debounced
  submission avoids intermediate-keystroke requests; native cursor pages contain
  at most 12 results. No full-result count or exact-phrase claim is made.
- The bounded six-release slider now replaces the old static hero, with large
  background imagery, overlaid release context/actions, indicators and seven-second
  rotation. Hover, focus, touch, hidden documents and reduced motion stop automatic
  movement. Pause/resume is explicit; media never autoplays. A decorative existing
  local photo fills missing artwork. The header floats in a rounded Caffeine frame.
  This follows the user's 27 October SkyStream interaction reference; no third-party
  branding/assets/content were copied. Search now starts after a 450 ms typing pause
  (Enter/button still immediate); the help paragraph is visually hidden.
- The primary reviewed the entire lot diff locally from fixed point `a6644da`,
  including retained user scope notes, new files and tests. The branch diff is
  non-empty. Standards/specification review and the `convex:convex-reviewer`
  security/performance/quality passes leave no blocking finding.
- Review corrections: initial search-input focus, small-height dialog scrolling,
  equal 36px navbar targets, search-text-only updates preserving Aggregate keys,
  album artist-name invalidation, canonical owner rechecks without duplicate
  source reads, and a 12-result server cap. A test-fixture typing/formatting issue
  was corrected before the final gate. Accepted trade-off: public search text
  increases discovery projection storage/read size; a separate lifecycle is
  deferred until catalogue size justifies it.
- **`pnpm check` passes 399 tests** (29 shared, 92 backend, 278 web), formatting,
  lint, TypeScript and production client/SSR builds. Security/lifecycle tests
  cover public-only indexing, stale candidates, suspension, revocation, missing
  profiles, withdrawals, edits, album-name refresh and versioned backfill.
- Convex development index creation/push succeeded. Backfill completion was
  observed as `initialized:true,searchVersion:1,pendingJobs:0`. Browser checks
  exercised FR/EN, dark/light, desktop and 390×844 layouts, 390×280 scrolling,
  initial focus, Escape/restoration, live title/artist/lyrics results, final-term
  prefixes, OR multi-word semantics, empty results and attribution. Native
  pagination boundaries, zero/one/many slider states and reduced motion are
  additionally isolated-test evidence.
- Live connectivity was intermittent: some auth/SSR requests, CLI operations
  and detail navigations failed or reconnected. Successful read-only searches
  used existing public content; no real publication, account/role change,
  moderation or destructive cleanup was used to populate tests. Full native
  relevance/tokenization, physical touch and cross-engine behavior are not
  inferred from the test adapter. Details and costs are in
  [lot8-verification.md](lot8-verification.md).
- The primary re-reviewed every follow-up change (hero replacement, floating
  header, debounce, tests and scope docs). No blocking standards/specification
  findings remain; Convex files were unchanged by this follow-up. Browser evidence
  includes automatic slide changes, manual indicators/arrow navigation, automatic
  MISS/Niavou searches without submission, clearing results, visually removed help,
  mobile header/hero/overlay at 390×844 with no horizontal overflow, and Escape
  restoring focus. The public Fan result successfully opened its canonical detail.
  The final gate includes formatting, lint, TypeScript, tests and client/SSR builds.
- Commit/push and an English Markdown PR form in Chrome are authorized; PR
  creation remains with the user. No lot 9, merge or production deployment.


### Lot 8 handoff decisions — 26 October 2026

Git now confirms merged lot 7, PR #5 at `62dd6eb`, on local `main`. The user
removed `docs/design-guidance.md` and the local image references; do not restore
them. Future screens follow the implemented interface and existing Caffeine
tokens. [Lot 8 direction](lot8-direction.md) records navbar overlay search, the
explicitly requested public musical-release home slider, read-only delegation
constraints and delivery workflow for the next implementation session. This
entry supersedes older next-mission/design-reference instructions. No product
code, account, deployment or Git delivery state was changed by this handoff.

### Lot 7 — completed locally, ready for user-created PR (26 October 2026)

Resumed from remote checkpoint `2e48b37` on `codex/public-discovery-layouts`.
The quota pauses and intermediate 339-test result are historical, not pending
work. The final root **`pnpm check` passes 380 tests** (29 shared, 83 backend,
268 web), formatting, lint, TypeScript and client/SSR production builds.
The primary reviewed the entire lot locally from `9f83883`, then re-reviewed
all visual follow-up changes and applied the Convex reviewer checklist. No
blocking standards/specification or Critical/Important Convex finding remains.
Evidence and accepted limits are in [verification](lot7-verification.md).

The final visual corrections follow the user's clarification, superseding the
first interpretation of duplicate navigation: **keep** Morceaux/Albums/Artistes
under the title and **remove them from the header**. Desktop header is Accueil
plus Studio (Artist) or Contributions (Fan). Language/theme/account have equal
36px targets and 6px gaps. A shadcn Sheet replaces the dense account dropdown,
with grouped navigation, prominent publication, separate sign-out, initial
heading focus, Escape/focus restoration and working router links.

Artwork controls across Artist/Fan song and album forms use one minimal browse
tile; profile uses the same control and a non-stretched 96px circular avatar.
The upload/authorization pipeline is unchanged. Intro/Outro are available in
both locales and lyric editors; pending/read-only tools cannot edit the text.
Native insertion, selection and Ctrl+Z were rechecked without submitting content.

The user's subsequent profile polish is also complete on this same branch:
avatar overlaps a working banner by 48px mobile / 64px desktop, with no phantom
offset after image failure; the tighter name/handle block aligns with the avatar.
Three equal-width profile tabs have a real active underline. The shared Tabs
primitive now targets Radix `data-state=active` rather than absent `data-active`.
The public-profile link is in the editor header, not the form footer. Primary
re-reviewed these changes and image/error/keyboard regressions before re-running
the complete root gate; the earlier 373-test result at `8d5a2b5` is superseded.

Authorized after Git verification: PR #4 merged lot 6 into `main` at `9f83883`.
The new branch `codex/public-discovery-layouts` starts from that fixed point.
Commit `06deac9` preserves the user's previously uncommitted roadmap/design
decisions for this and future lots, including ignored local PNG references.

- Implement one public Artist/Fan song projection, coherent numbered pages,
  counts, visibility maintenance and bounded home/artist/album selections.
- Apply `design/` layouts with the current Caffeine theme unchanged; keep Fan
  contribution tools and moderation while replacing separate public discovery.
- Add role-aware mobile navigation, normal-flow desktop footer, responsive
  Studio/form layouts and optional heading insertion in the canonical textarea.
- Search remains explicitly unavailable until lot 8; likes, comments, notebooks,
  sharing and artist claim/replacement remain in their own lots.
- Ranking uses real deduplicated signed-in-member views over seven UTC days;
  anonymous reading stays public and does not contribute to that metric. No
  fictitious ranking, playback or likes are claimed.
- Implementation may be delegated with explicit ownership. The primary agent
  retains the mandatory entire local diff review and applicable Convex review.
  Completion review, root gate and browser evidence are recorded above and in
  verification. Push is authorized by the user's standing workflow, but PR
  creation is not: stop at the prepared English description in Chrome. No lot 8,
  production deployment, merge or new account/role/content mutation.

### Lot 6 community follow-up — completed locally 26 October 2026

Resumed from checkpoint `b54177d` on `codex/community-fan-lyrics`. The original
lot 6 was already completed at `64f2654`; lot 5 and T1 remain merged and closed.
This follow-up implements the user's three additions, not lot 7's redesign.

- Own-post reporting is hidden and rejected on the server; other readers use
  the top Options menu and an accessible report dialog instead of a bottom form.
- Admins can restore hidden reported contributions with a reason, revision and
  idempotent request. An independent restoration audit preserves the original
  hide decision. Removed content/unavailable authors cannot be restored.
- Fans can add optimized artwork and optional song-like metadata without
  changing the session-derived contributor or official Artist catalogue.
  Partial image failure retains public text/form/file and allows safe retry.
- Bounded account cleanup includes artwork/intents/restorations. Cross-domain
  image claims protect foreign files; foreign moderation history is anonymized.
- The primary agent reviewed the entire follow-up locally from fixed point
  `64f2654`, including new files/tests, with the Convex skill's security,
  performance and quality passes. No final review was delegated and no blocking
  standards/specification or Critical/Important Convex finding remains.
- Review corrections include blank optional genre handling, strict test fixture
  indexing, cross-domain storage preservation, ambiguous-response recovery and
  a short-height dialog max-height/scroll correction. The last is accessibility
  maintenance only; the user reaffirmed that redesign belongs to the next lot.
- Root `pnpm check`: formatting, lint, TypeScript, **259 tests** (29 shared,
  72 backend, 158 web), client/SSR production builds. Mobile 390 × 844, desktop
  1280 × 900, short-height dialog 390 × 280 and keyboard/focus checks passed.
  Fan artwork/metadata and Chrome admin restoration were verified live against
  the synthetic contribution, as detailed in the linked record. Destructive
  deletion/removal and failure retries remain isolated-test evidence.
- Accepted limits and historical evidence are in
  [the follow-up record](lot6-community-followup.md): optional artwork attaches
  after public text, so partial success is explicitly visible and retryable;
  existing file URLs/downloads cannot be recalled; no physical-device or
  cross-engine matrix is claimed. No push, PR, remote merge or production
  deployment occurred. Lot 7 implementation has not started.

### Approved next-lot design direction — 25 October 2026

Documentation only: the user approved integrating necessary `design/` mockups
within lot 7, without changing Caffeine colors or creating a separate design lot.
Artist publications and Fan contributions will share public song lists with
origin badges; the separate public Community listing is superseded. Fan author
tools, contribution attribution, ownership, moderation, and old detail links
must be preserved. Search gets an explicitly unavailable visual entry in lot 7;
functional search stays in lot 8. Responsive layout, shadcn reuse, footer/bottom
navigation, horizontal home rows, Studio tabs/actions, and lyric heading insertion
were recorded in the former design-guidance document (subsequently removed by
the user). No product code was changed
for this decision, and this entry does not claim lot 7 has started or authorize
push, PR, merge, or production deployment.

### Lot 6 completed locally — Community Fan lyrics, 25 October 2026

The user authorized resumption after switching the browser to a Fan account.
Active branch: `codex/community-fan-lyrics`. The account-deletion prerequisite
and validated redirect-flash fix (`3da2c3e`) were integrated locally in merge
`66b5d9f`. Lot 5 (`b9b5c4d`) and T1 (`80ade32`) remain merged and closed.
The paused records below are historical, not the current mission.

- The separate Fan publication/report domain and community cleanup extension
  are complete, with the real Fan/admin journey verified as recorded below.
- The primary local review uses fixed prerequisite point `3da2c3e`, including
  the original lot 6 checkpoint and all resumed changes.
- No push, PR, remote merge, production deployment or lot 7 is authorized.
- Cascade policy: owned contributions and their dependent reports/decisions are
  deleted. On other authors' content, reporter/moderator member references are
  anonymized; deleted reporters' free-text reasons become
  `Reporter account deleted.`. Private decisions retain action/reason/time and
  report revision/status so account deletion cannot reverse another author's
  moderation. New writes still derive these identities from the session.

#### Completion evidence

- Public Fan publication is immediate and session-attributed, separate from
  official Artist songs/albums. The author can edit only their own published
  contribution. Lyrics preserve the raw source and remain mandatory; duplicate
  warnings require an explicit choice and never merge rows automatically.
- Reports are private and do not change public visibility. Only an authorized
  admin can resolve an existing report with a reason and revision check.
  Hide/remove and audit writes commit transactionally; duplicate decisions are
  idempotent and a moderated contribution cannot be edited back into public view.
- The bounded deletion extension handles more than 25 publications/dependents,
  retry and stalled jobs already in the old final phase, immediate public
  withdrawal, anonymization and cross-account preservation. Its three new tests
  use isolated data; no live account was deleted by the agent.
- The primary agent reviewed the **entire** lot diff locally from `3da2c3e`,
  including original checkpoint files, generated routes/API, new tests and docs.
  No completion review was delegated. Convex security, performance and quality
  passes checked session roles/authorship, deleted JWTs, projections, private
  reports, indexed pagination, bounded cleanup and concurrent writes. No blocking
  standards/specification or Critical/Important Convex findings remain.
- Corrections found during implementation/review: separate public/own/report
  empty descriptions; stable locale/UTC moderation dates; targeted account
  loading under public lyrics; stronger forged-author/Artist/missing-report
  tests; whitespace moderation reasons, pending double submission and renewed
  removal consent; async DOM-test lifecycle warnings; tablet navbar overflow.
  Navigation now stays compact below 1,024 px, consistently for loading,
  anonymous, Fan and admin states.
- `pnpm check` passes formatting, lint, TypeScript, **208 tests** (29 shared,
  58 backend, 121 web) and production client/SSR builds. Web tests include 10
  actual Radix/TanStack Form moderation interactions, 10 display-state cases,
  four authoring cases and four navigation-breakpoint cases. The final web suite
  has no React act warnings. Development-only `convex dev --once` succeeds;
  no production deployment was performed.
- Live Fan checks: required empty lyrics block submission; publish/read with
  visible contributor credit; edit/raw-text round-trip; own/public list;
  duplicate warning without creating another row; technical self-report with
  continued public visibility; admin queue forbidden to the Fan. Anonymous
  Convex reading returned the public projection, then no content after hiding.
- The user explicitly authorized promoting the named account open in Chrome.
  The existing internal `admin:bootstrapFirstAdmin` succeeded in development;
  that account remains Artist with `isAdmin`, while the separate Codex browser
  account remains an ordinary Fan. No new public promotion endpoint or bypass
  was added. Do not repeat bootstrap: it is single-use.
- Chrome admin checks: open the real report, inspect reported/current revision,
  save a justified hide decision and observe its recorded outcome. The Fan then
  sees `Masquée`, no edit action; direct edit is blocked and the public URL is
  unavailable. The only live contribution changed is original synthetic text
  `[TEST LOT 6] Fenêtre ouverte` (`ks7866ae7f2f756afyzybf1kz58gz4at`), retained
  hidden with its technical report/decision
  (`m1719tftqbhb40dd9qc13v54v58gzr7e`). No existing publication was edited.
- Relevant mobile (390), tablet (768/1,024) and desktop widths were checked.
  Fan/admin pages have no horizontal overflow after the navbar fix; Chrome
  moderation labels were checked in French and English. Locale and viewport
  overrides were restored. Both tested browser sessions report no console errors.
  Final proof: `/tmp/lyrx-lot6-moderation-proof.png`. Remove/cascade destructive
  paths and dismiss are proved by isolated backend/DOM tests, not a live deletion.
- Accepted trade-offs: duplicate lookup is bounded best-effort, not lot 8 search;
  public pagination can be short after filtering inactive authors but retains
  Load more; removed content is private audit data until author deletion.
  These limits are recorded in development/architecture documentation.
- Saved locally on the active branch; no push, PR creation or remote merge was
  performed. Lot 7 has not started and still requires user approval.

### Completed prerequisite — Deletion/redirection flash correction, 25 October 2026

Resumed and implemented on `codex/account-self-deletion`; the paused checkpoint
below is historical and superseded by this correction. Lot 6 remains separate.

- Reproduced the actual intermediate DOM states with React DOM, `happy-dom`,
  deferred mutations/navigation and reactive query invalidation. Before the fix,
  three account cases displayed `Profil indisponible`/`Compte suspendu`; two
  catalogue cases reached a `NOT_FOUND` error boundary before navigation.
- Song/album previews now suspend only their deleted-resource detail subscription
  during deletion and keep the existing neutral skeleton until navigation. Real
  mutation failures restore the subscription and visible error feedback. Missing
  resources outside a deletion still reach the normal error boundary. Navigation
  failure after confirmed deletion falls back to full document navigation rather
  than resubscribing to an already-deleted resource. Album-track deletion retains
  its parent-album return destination.
- Account deletion state now lives above the profile's auth-dependent rendering.
  The safe current-member query remains reactive, but its anonymous/suspended
  transition cannot replace the form with an error or unmount the deletion
  controller before native success/navigation. Failures restore the profile and
  actionable dialog feedback. A completed deletion remains locked until leaving;
  no artificial timeout or global error suppression was added.
- The primary agent locally reviewed all follow-up changes from `0b43973`,
  including the test-only dependency/lockfile checkpoint, production callers and
  interaction regressions. No completion review was delegated. No backend file
  changed in this follow-up, so a new Convex review/deployment is not applicable;
  the original account-deletion backend review remains recorded below.
- Verification: 13 new DOM regression cases cover the transient frames, deferred
  navigation, real failure/retry, normal missing-resource errors and full-document
  fallback. `pnpm check` passes formatting, lint, TypeScript, **164 tests**
  (29 shared, 42 backend, 93 web), and production client/SSR builds.
- The user independently tested song and album deletion and confirmed that the
  flash no longer appears. The agent checked the current Fan profile's native
  confirmation and cancellation without submitting deletion or saving any form.
  Browser proof: `/tmp/lyrx-deletion-flash-profile-proof.png` (unchanged profile,
  not evidence of a live account deletion). The account transition is verified
  through the isolated DOM tests, not a destructive real-account test.
- No account/resource was deleted by the agent, and no push, PR, merge or next lot
  was performed. Resume lot 6 only after user approval, with its required community
  cascade extension and Fan/admin validation still pending.

### Paused checkpoint — deletion/redirection flash, 25 October 2026

The user requested a quota stop. Stay on `codex/account-self-deletion`;
the completed account-deletion implementation is saved at `0b43973`.
The newly reported flash correction is **not implemented or verified yet**.

- Scope: remove the transient error/unavailable message when deleting a song,
  album or account, without hiding real failures. No PR, push or next lot.
- Read-only inspection found that `ReadySongPreview` and `ReadyAlbumPreview`
  keep their `getMySong`/`getMyAlbum` subscriptions active while awaiting delete
  and navigation. Those server reads throw `NOT_FOUND` after deletion; Convex
  rethrows inside `useQuery` before later rendering guards. For account deletion,
  `ProfileEditor` can switch to suspended/anonymous/unavailable while its nested
  deletion dialog awaits native success and full navigation.
- These are code-inspection findings, not a completed reproduction. First build
  a deterministic failing interaction test: deferred deletion, reactive query
  invalidation before resolution, then delayed navigation. Assert no error frame;
  also assert real deletion failures remain visible and normal missing-resource
  errors are not globally suppressed.
- Added test-only `happy-dom` to `apps/web/package.json` and the lockfile so
  React DOM interaction tests can exercise the actual state updates. No product
  code changed, no regression test was written, and checks have not been rerun
  for this checkpoint. The earlier 151-test gate applies to `0b43973` only.
- Candidate direction to validate after the red test: set deletion state before
  subscribing, pass `"skip"` to the affected query while deleting, retain a neutral
  pending view through navigation, and restore subscriptions on real failure.
  Account state must live above the profile branch so auth invalidation cannot
  unmount its deletion controller prematurely. Do not add a timed error delay.
- No live resource/account was deleted or modified during this investigation.
  The browser was reported at `/onboarding` when the user paused; obtain fresh
  browser state on resumption. Lot 6 remains separately saved at `1298ef1`.

**Completed prerequisite — self-service account deletion** (25 October 2026), on
`codex/account-self-deletion`, based on `541b610`. The user explicitly requested
this prerequisite before continuing the Fan test journey. Implement native
Better Auth self-deletion with irreversible confirmation and resumable cascade
cleanup of owned publications, profiles and images. Do not delete the user's
live account during verification. Lot 6 is saved separately at `1298ef1` and
is not being closed or replaced by this prerequisite.

**Lot 6 — Community fan lyrics and report moderation** was authorized on
25 October 2026. Work starts on `codex/community-fan-lyrics` from merged
`main` at `80ade32` (T1, PR #2). The user's local product/specification/roadmap
updates are retained and supersede the former private-proposal approval flow.

Implementation plan:

1. Add a separate community domain with server-enforced Fan publication and
   immutable session-derived attribution. Never write official catalogue rows
   from this flow or expose an artist claim/replacement operation.
2. Add Fan authoring, public reading and visible contributor credit. Keep lyrics
   required and warn about likely title/artist duplicates without auto-merging.
3. Add private reports and administrator-only report resolution with a reason
   and audit record. Reporting alone does not hide content; only a subsequent
   moderation decision changes public visibility.
4. Verify Fan/Artist/Admin, cross-account and suspension boundaries, publication,
   report idempotency and hide/remove visibility. Run the local review gate,
   root checks, development Convex deployment and relevant browser checks.

No push, PR, merge, production deployment or lot 7 is authorized.

### Lot 6 implementation checkpoint — 25 October 2026

The community domain, Fan editor/public reader, private report queue and
post-report administrator decisions are implemented but the lot is **not
closed**. `pnpm check` passes with 129 tests (28 shared, 47 backend, 54 web),
TypeScript, lint and production builds. Development Convex deployment and the
anonymous empty-list read succeeded. Browser checks reached the empty public
list; the available account is Artist, not Fan. Full Fan and administrator
browser journeys and the final local completion review remain outstanding.
No live contribution was published and no account role was modified for testing.

The user then requested self-service Better Auth account deletion **before**
switching to a Fan account to finish lot 6 validation. Save this implementation
on `codex/community-fan-lyrics`; do not declare it complete or create a PR.
Account deletion is a separately authorized prerequisite. When resuming lot 6,
extend its deletion cleanup to the new community tables before closure.

### Account-deletion prerequisite — 25 October 2026

- Implemented separately on `codex/account-self-deletion` from `541b610`.
  Native Better Auth self-deletion is enabled; no public application mutation
  accepts a member id for deletion. Its transactional user trigger resolves the
  same issuer/subject key as Convex and records revocation, suspension and a
  durable cleanup job. HTTP auth deletion is multi-call and cleanup is eventual,
  not presented as a single atomic operation.
- The indexed cascade removes owned songs, legacy sections/lines, album tracks,
  albums, profiles, upload intents and registered image claims in bounded batches.
  Catalogue Aggregate triggers stay active. It preserves other members and any
  file still referenced elsewhere. A five-minute recovery cron resumes stalled
  jobs. Unregistered uploads retain the existing global grace-period sweep.
- Unexpired JWTs cannot write or repeat onboarding after deletion. A minimal
  auth-id/time tombstone remains, without email or publication content. Internal
  suspension controls cannot reactivate a pending-deletion member. New signups
  with the same email use a fresh identity; old content is not restored.
- `/profile` offers deletion to ready Fan/Artist, suspended, onboarding and
  unverified signed-in users. A typed `SUPPRIMER`/`DELETE` confirmation is required;
  the password is optional for a fresh session, including Google-only accounts.
  Errors remain localized and actionable; freshness failures offer native sign-out
  then sign-in. Full navigation occurs only after confirmed native success.
- The primary agent reviewed the entire diff locally from `541b610`, including
  new files, schema, generated API, tests and documentation. No completion review
  was delegated. The Convex review checked server-derived identity, stale JWTs,
  internal-only cleanup, bounded indexed reads, transactional Aggregate updates,
  scheduler retries and cross-account storage claims. Corrections included
  blocking internal reactivation of a deleted identity and the confirmation-word
  translation interpolation. No unresolved blocking standards/specification or
  Critical/Important Convex findings remain.
- `pnpm check` passes formatting, lint, TypeScript, **151 tests** (29 shared,
  42 backend, 80 web) and production client/SSR builds. Tests include native
  HTTP deletion/password/freshness, auth session/account removal, old-token
  rejection, same-email new identity, 27-resource and 51-line/52-section
  cascades, image claim preservation, Aggregate coherence and stalled-job retry.
  Development-only `convex dev --once` succeeds; no production deployment.
- Browser checks on the authenticated Artist profile at 390×844 and 1280×900
  verify warnings, confirmation disabled/enabled behavior, optional password,
  default Cancel focus and cancellation. Mobile document width remains 390 px
  (358 px dialog), with no horizontal overflow. The desktop screenshot is
  `/tmp/lyrx-account-deletion-proof.png`. A stale development bundle required a
  local Vite restart; transient HMR locale-provider errors were observed and are
  not claimed as a production fix. No final deletion, sign-out, profile save,
  role change or test publication was performed on the real account.
- The user's standing permission to use useful coordinated sub-agents is now
  recorded in `AGENTS.md`, without changing the primary-only review gate.
  No push, PR or merge was performed. Lot 6 remains checkpointed, not complete;
  its community cleanup extension and real Fan/admin journeys are still pending.

## Completed T1 history

**Technical lot T1 — Catalogue backend modules and image upload optimization**
was authorized on 24 October 2026 and is complete locally. Work is isolated on
`codex/catalogue-refactor-image-uploads`, based on merged `main` at `b9b5c4d`.
The scope is catalogue-only Convex refactoring, atomic caller/path migration,
and client-side preprocessing of avatar, banner and artwork uploads while
preserving server validation, ownership, cleanup and Aggregate invariants.
The implementation reference is
[Hallohallo patterns](research/hallohallo-patterns-for-lyrx.md).

**Lot 5 is merged and closed.** PR #1 was merged into `main` at `b9b5c4d` and
its remote branch was deleted by the user. Its history below is retained as
completed evidence; T1 neither reopens lot 5 nor starts the lot 6 community-lyrics
lot.
The user subsequently authorized PR #2, then merged it at `80ade32`. The
earlier local-only statements below describe their historical checkpoints.

### Authorized T1 artwork UX follow-up

The user's next annotations authorize a same-branch refinement, reviewed from
`17bcefa`: hide the optimization explanation, add direct owner-only pencil
controls to song/album preview artwork, and offer artwork selection on both
creation and editing forms. This is not a reopening of lot 5 or the start of
lot 6. This follow-up is now complete locally; the earlier quota checkpoint
below is retained only as history.

Resumed on 24 October with further user-authorized changes: compact artwork
thumbnails below the desktop breakpoint, remove generic editor introductions,
make section-heading guidance explicitly optional with a lyrics placeholder,
and use English for authored Convex messages. The user explicitly confirmed
permanent removal of `primaryLanguage` values and schema fields, including the
album-track inheritance flag. Preparatory revision `c39cd1b` stopped new language
writes while keeping the legacy schema optional. The development cleanup and
zero-removal verification are complete, and the tightened schema is deployed.

#### Follow-up completion — 24 October 2026

- The primary agent reviewed the whole follow-up against fixed point `17bcefa`,
  including the new helpers, migration, generated API, callers and tests. The
  original T1 review against `b9b5c4d` remains recorded below. No review was
  delegated. Convex security, performance and type/quality passes found no
  unresolved Critical or Important findings: maintenance is internal, paginated
  at 25 rows, and deletes only the three approved keys. Artist ownership,
  storage claims and Aggregate keys are unchanged.
- Ran the development-only cleanup before tightening the schema. The observed
  verification traversed **7 songs, 2 albums and 5 album-track rows** and
  removed **zero remaining values** in all three tables. The earlier cleanup
  process's totals were not retained across the interrupted session; no total
  deletion count is claimed. The final `convex dev --once` succeeded with all
  three fields absent from the schema. No production migration was run.
  Legacy language values are permanently removed in development, without a
  normal UI undo; documents, lyrics, artwork and track positions were retained.
- Authored Convex diagnostics and auth-email text are English; existing stable
  error codes select French/English client feedback. Historical lyric headings
  remain untouched source content. Real email delivery was not exercised.
- Generic editor introductions are removed. Lyrics remain required, while
  section markers are explicitly optional and the textarea has a free-writing
  placeholder. The mobile cover bug was reproduced at 600 px (521 px square)
  and corrected to 96 px. Browser checks at 390, 600 and 1280 px show compact
  thumbnails (96/160 px) without horizontal overflow.
- The private song's pencil handles a corrupt image with a durable localized
  error, then successfully retries from Enter-key activation. The Studio shows
  exactly one `[TEST T1 UX] Pochette création` row after the creation retry.
  A dedicated `[TEST T1 UX] Pochette album` draft was created with a selected
  cover at `/studio/albums/jx7cekd4kncgxrj8rmb91878258gwbmq/preview`; direct
  pencil replacement and immediate edit-form upload both succeeded. Pending
  controls disable while uploading. New-song UI has no language field, generic
  introduction or read-only lyrics preview. The dashboard subtitle remains.
- Public artwork has no edit control, and empty-cover/pending controls are
  covered by SSR tests; empty-cover upload was not separately exercised live.
  No draft was published or deleted, no avatar/banner or unrelated user content
  was modified. Temporary browser sizing was reset. No new warning/error was
  captured during the final browser checks; older HMR/provider errors remain
  in the historical browser log and are not claimed to have been fixed here.
- `pnpm check` passes formatting, lint, TypeScript, **113 tests** (28 shared,
  35 backend, 50 web), and production client/SSR builds. The gate caught and
  corrected a constant-loop lint issue and a stale positional display assertion
  after language removal; both corrected files were reviewed again.
  `git diff --check` passes. Browser proof is saved locally at
  `/tmp/lyrx-t1-form-proof.png` (temporary evidence, not a repository asset).

The user accepted the result. Save a final local commit only; no push, PR,
merge, production deployment or next lot is authorized.

#### Quota checkpoint — 24 October 2026

Historical checkpoint, superseded by the completion evidence above. At this
point the user reported their quota running out and requested a local stop.
The follow-up was not yet declared complete. Work stayed on
`codex/catalogue-refactor-image-uploads`; no push, PR, merge or lot 6.

Implemented since `17bcefa`:

- Removed optimization explanations from artwork/avatar/banner helper text;
  catalogue forms show format/size help once instead of twice.
- Added shared `CatalogueArtwork` with an accessible pencil/add button, pending
  spinner and file chooser. Only the artist song/album previews pass its edit
  action; public/read-only views get no upload control. Navbar unchanged.
- Both creation forms now offer artwork selection with local preview/removal;
  existing editor uploads remain immediate. `useArtworkSelection` revokes blob
  URLs on replacement/unmount. Compression and server ownership remain intact.
- `saveCatalogueDraft` remembers the created id before uploading. An image
  failure leaves the form and values in place with a partial-success message;
  retry updates the same draft. Custom song artwork overrides album-artwork
  inheritance; successful existing-song uploads also clear that form flag.
- Five save/retry tests and five SSR artwork-control tests were added.
  `pnpm check` completed with **109 passing tests**, typechecks and production
  builds. It reported 11 `require-await` warnings in new test mocks; those
  mocks were corrected to explicit Promise returns afterward. The final gate
  has **not** been rerun on that correction yet.

Browser evidence so far (authenticated in-app account, development only):

- New-song form shows the picker and no optimization explanation. A corrupt
  JPEG at `/tmp/lyrx-t1-invalid.jpg` produced the partial-success error without
  clearing the typed title/lyrics or leaving the form.
- Selecting `/tmp/lyrx-artwork-ux-fixture.png` and saving again succeeded and
  opened the private `[TEST T1 UX] Pochette création` preview at
  `/studio/songs/kd7c9mkyedta9az1x74m8znbn98gwf4z/preview`. The preview exposes
  `Modifier la pochette`. The fixture is a generated non-personal 1800×1200 PNG.
- No test draft was published or deleted. No avatar/banner or unrelated user
  content was changed in this follow-up.

Remaining work recorded at that checkpoint (now resolved above, with explicit
live-test limits):

1. Rerun `pnpm check` after the warning correction and review the complete
   follow-up diff from `17bcefa` locally (including untracked/new files).
2. Exercise the pencil upload itself on the test song, and create a dedicated
   test album with a selected cover; test album pencil/empty-cover behavior.
3. Check existing edit-form upload behavior, mobile layout/keyboard access,
   console and no overflow; verify no duplicate after the failed-image retry.
4. Confirm useful error/retry states and public read-only controls remain absent.
   The resumed scope now changes Convex messages and includes a data cleanup;
   repeat the Convex review and verify a development push before handoff.
5. Update completion evidence and save a final local commit. Do not create a PR.

### T1 implementation and verification

- Fixed review point: merged `main` at `b9b5c4d`. The primary agent reviewed
  the entire T1 change set locally against repository standards and this
  request, including new files, generated API changes, callers and tests.
  No code-review sub-agent was used. The only check correction was changing
  three extracted helper imports to type-only imports; the corrected files
  were reviewed again. No blocking standards or specification finding remains.
- The `convex:convex-reviewer` security, performance and quality passes found
  no unresolved Critical or Important finding. Artist authorization and
  ownership, explicit return validators, deliberately anonymous published-only
  projections, indexed bounded reads, transactional Aggregate writes and the
  exhaustive storage-claim registry are preserved. All 82 declarations from
  the old catalogue were compared after path/import normalization: no business
  logic difference. Named Aggregate definitions are unchanged.
- The catalogue now owns `read`, `songs`, `albums`, `artwork`, `values`,
  `access`, `tracks`, `lyrics`, `lyricsMigration` and `aggregates` modules.
  Every current web caller, test, cron, new schedule and migration command uses
  the nested paths. The two former root modules retain only internal aliases
  for pre-migration scheduled work; removal requires inspecting pending jobs
  on all target deployments, not a guessed expiry date. The compatibility
  aliases have an additional regression test. This deliberate compatibility
  trade-off is accepted; no global queries/mutations directories were created.
- `prepareImageForUpload` is shared by avatar, banner, song and album artwork.
  Per-kind dimension/byte targets, same-origin bundled worker, lazy codec,
  actual MIME handling, EXIF policy and fail-closed errors are documented in
  [architecture.md](architecture.md). Input limits and server security remain
  independent. The original is neither uploaded nor retained as a derivative.
- `pnpm install --frozen-lockfile`, `pnpm check` and `git diff --check` pass.
  The gate includes formatting, lint, TypeScript, **99 tests** (28 shared,
  32 backend, 39 web), and production client/SSR builds. Fourteen new image
  tests cover all three policies, worker asset origin, output type fallback,
  invalid inputs and failed encoding; the localized error has a regression
  case. The production build emits the local compression worker asset.
- Real code generation and `convex dev --once` succeeded on the configured
  **development** deployment (`Convex functions ready`, 24 October 2026).
  No production deployment or schema migration was run for T1.
- The authenticated in-app browser successfully read the migrated Studio and
  created/read a private `[TEST T1] Optimisation image` draft. Uploading a
  synthetic **3200×2400 JPEG, 5,666,941 bytes**, stored one **1520×1140 WebP,
  609,300 bytes** (about 89% fewer bytes, same aspect ratio). `_storage`
  metadata confirmed the MIME/size; no upload intent remained after success.
  A deliberately corrupt JPEG displayed the French preparation error before
  any upload, left storage unchanged and created no intent. Browser console:
  no warning/error. Existing avatar, banner, songs and albums were not edited.
  The test draft is intentionally left unpublished, not silently deleted.
- Live avatar/banner replacement, browsers without WebP support and the
  worker-unavailable fallback were not exercised against a real account;
  their helper policies/output contracts are covered by automated tests.
  These evidence limits do not claim a cross-browser live acceptance matrix.

T1 is a local delivery only: no push, PR or merge. The next action requires the
user's direction; do not begin lot 6 or reopen lot 5 automatically.

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
- [x] Lot 3 `pnpm check` passes formatting, lint, TypeScript, 37 tests, and all
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
- [x] The user-directed Soft Pop and photographic-hero correction passes its own
      final Standards re-review with 0 hard violations and 0 judgement calls and
      its final Spec re-review with 0 remaining or new findings and 0 scope
      creep. The final `pnpm check` remains clean with 37 tests.
- [x] Lot 5 `pnpm check` passes formatting, lint, TypeScript, 76 tests, and the
      client/SSR production builds. The local standards/specification review and
      Convex review have no unresolved blocking finding.
- [x] The album-workflow refinement passes `pnpm check` with 81 tests and both
      production builds. Aggregate backfill and the development Convex push
      succeeded; desktop and 390×844 browser checks have no console error.

## Lot history

### Lot 5 — Web structure and lyric entry (complete)

- La base de revue obligatoire est `481d69c`; le diff du lot jusqu'au commit
  d'implémentation final `ad020b8` est non vide. La revue a porté sur l'ensemble
  de ce diff, et pas seulement sur les derniers correctifs.
- `routes/` possède désormais la composition, les paramètres et les boundaries.
  Les providers et le shell globaux résident dans `app/`; les écrans métier
  résident dans `features/`. Le répertoire historique
  `apps/web/src/components/` n'existe plus. `SongEditor`, `AlbumEditor` et
  `ArtistStudio` sont séparés en contrôleurs, formulaires, étapes, cartes et
  contrôles de publication au lieu de réunir toutes les responsabilités dans
  un seul fichier.
- Le routeur installe `ConvexQueryClient`, `QueryClient` et
  `setupRouterSsrQueryIntegration`. Les pages publiques profil et chanson
  préchargent leur `convexQuery(...)` avec `queryClient.query` et
  `staleTime: "static"`, puis lisent la même requête avec
  `useSuspenseQuery`. Cette forme remplace l'API `ensureQueryData` dépréciée.
  Les requêtes catalogue protégées par Better Auth restent client-only : aucun
  loader serveur protégé n'a été ajouté sans preuve du transfert du jeton au
  client HTTP Convex.
- La page publique `/songs/$songId` rend uniquement les données publiées et les
  paroles en lecture seule. Les projections publiques excluent les identifiants
  de propriétaire et l'attestation de droits. Un brouillon ou le contenu d'un
  membre suspendu reste invisible publiquement.
- Le seul éditeur normal est `lyricsText`, un `textarea` TanStack Form. Le texte
  brut, ses retours à la ligne et ses balises restent la source canonique. Le
  parseur sert seulement à l'aperçu et au rendu. Les tests couvrent CRLF,
  balises françaises/anglaises, balises inconnues, texte sans balise, lignes
  vides, en-têtes consécutifs, limite serveur, conservation exacte, lecture
  publique et compatibilité des anciennes lignes.
- La migration `internal.catalogue.backfillSongLyricsText` traite un morceau par
  transaction, poursuit par curseur planifié et conserve les anciennes tables
  pendant la phase de compatibilité. Le déclencheur reproductible
  `pnpm --filter @lyrx/backend migrate:lyrics` est documenté dans
  `docs/development.md`. Il n'a pas été exécuté automatiquement sur une
  production. Une synchronisation locale `convex dev --once` a uniquement mis
  à jour le déploiement de développement afin de remplacer l'ancien contrat
  `sections` par `lyricsText`.
- Revue locale Standards/Spec : les écarts trouvés (boundaries dépendantes de
  providers pas encore montés, absence de page publique de chanson et message
  d'erreur catalogue trop spécifique) ont été corrigés puis revus. Il ne reste
  aucune violation dure ni défaut de spécification bloquant.
- Revue Convex : 0 finding Critical et 0 Important. Suggestion acceptée : la
  lecture de compatibilité d'un ancien morceau peut lire jusqu'à 4 000 lignes,
  mais elle reste bornée, temporaire et couverte par un backfill paginé et
  relançable ; supprimer les anciennes tables fera l'objet d'une migration
  séparée après vérification de chaque déploiement.
- `pnpm check` passe avec 28 tests shared, 27 tests backend et 18 tests web,
  soit 73 tests, ainsi que les builds client et SSR. La route profil publique a
  été observée en SSR et le brouillon public a renvoyé l'état introuvable sans
  débordement à 390 px avant que l'utilisateur choisisse de reprendre lui-même
  les vérifications visuelles finales. Aucune publication n'a été provoquée
  pour fabriquer une preuve visuelle.
- Correctif post-clôture du 2026-10-23 : l'aperçu du morceau affiche désormais
  date de sortie, langue, genre, album public associé, artistes invités,
  auteurs, compositeurs, producteurs, label et liens d'écoute. Chaque lien
  conserve une action externe ; YouTube et Spotify proposent en plus un lecteur
  officiel chargé uniquement après un clic, sans autoplay ni code d'embed fourni
  par l'utilisateur. L'aperçu d'album affiche aussi sa date de sortie et ses
  crédits. Le test de régression couvre tous les champs, les deux formats
  d'embed et le refus des liens non pris en charge. `pnpm check` passe avec 76
  tests et les builds client/SSR. La revue locale du diff
  `a164acd...a7f57f6` ne relève aucun défaut bloquant ; la revue Convex est non
  applicable, car aucun fichier Convex n'a changé. La vérification visuelle
  finale reste volontairement manuelle à la demande de l'utilisateur.
- Refonte post-clôture du 2026-10-23 : la page partagée par l'aperçu artiste et
  la lecture publique place désormais les paroles au premier plan. Elle possède
  un en-tête compact, une navigation sticky dérivée des sections, une citation
  discrète pour le contexte, une colonne de paroles sans carte et une sidebar
  repliable pour l'écoute et les détails. YouTube et Spotify utilisent des
  onglets shadcn et ne montent leur iframe qu'après une action explicite ; les
  autres plateformes conservent leur lien source. La revue locale complète du
  diff `175a1ad...fe69cc3` a corrigé la duplication possible d'un fournisseur,
  le positionnement de la navigation sous le header et la sélection devenue
  obsolète après une mise à jour temps réel. Il ne reste aucun défaut Standards
  ou Spec bloquant. La revue Convex est non applicable : aucun fichier sous
  `packages/backend/convex/` n'a changé. `pnpm check` passe avec 28 tests shared,
  27 tests backend et 23 tests web, ainsi que les builds client et SSR. La
  vérification visuelle desktop/mobile est laissée à l'utilisateur conformément
  à sa demande ; aucune preuve visuelle n'est revendiquée dans cette passe.
- Correctif post-clôture du 2026-10-23 (retours d'usage) : l'éditeur propose
  maintenant aussi « Ajouter » sous une liste de liens d'écoute déjà présente,
  et l'édition d'un morceau existant peut être enregistrée depuis une étape
  intermédiaire sans forcer le parcours jusqu'aux paroles. L'aperçu sépare
  Retour, Modifier et Supprimer ; la suppression est confirmée, autorisée et
  réalisée côté Convex, retire l'association d'album et remet cet album en
  brouillon. Le test couvre le refus inter-compte et ce nettoyage.
- L'aperçu n'affiche « Voir plus » que si la description est réellement
  tronquée. Les lecteurs explicites « Écouter sur Spotify/YouTube » ont un état
  d'onglet contrasté et un curseur pointeur ; la navigation des sections reste
  desktop uniquement à la demande de l'utilisateur. La pochette desktop
  s'aligne désormais en bas du bloc identité/description, sans modifier la
  composition mobile retenue par l'utilisateur.
- Revue locale du diff correctif : aucune violation Standards/Spec bloquante.
  Revue Convex : 0 Critical et 0 Important ; `deleteSong` est une mutation
  artiste avec validateurs, contrôle d'appartenance, accès indexé et lectures
  bornées. Dans le navigateur intégré Codex à 1028 px, l'alignement desktop,
  les onglets, les curseurs et la boîte de confirmation ont été vérifiés ; le
  contenu n'a pas été supprimé pendant ce contrôle. `pnpm check` passe avec 28
  tests shared, 28 backend et 23 web, ainsi que les builds client et SSR.
- Extension album post-lot du 2026-10-24, basée sur `a6cca538` : la création
  d’un morceau choisit explicitement single ou album et peut hériter de la
  pochette, de la langue, du genre, du label et des crédits généraux, avec une
  personnalisation champ par champ. Un morceau reste limité à un album. La
  suppression d’un album conserve les morceaux en matérialisant les valeurs
  héritées avant de détacher les associations.
- L’aperçu artiste d’un album expose maintenant les actions Modifier/Supprimer,
  le rattachement recherché d’un single, la création directe déjà liée, les
  statuts Brouillon/Publié et une liste de pistes prioritaire. Le réordonnancement
  accepte le glisser-déposer pointeur/clavier et conserve les boutons haut/bas.
  La page publique `/albums/$albumId` utilise le même pattern SSR
  `convexQuery`/`useSuspenseQuery` que les autres données publiques et ne reçoit
  que les pistes publiées. La publication d’un album exige au moins une piste
  publiée.
- Revue locale complète : aucun défaut Standards/Spec bloquant ne reste. La
  revue Convex a corrigé la compaction des positions après retrait afin
  d’éviter trous et collisions lors d’un rattachement ultérieur ; les fonctions
  publiques ont leurs validateurs, les mutations artiste centralisent
  authentification et propriété, et les listes restent indexées et bornées.
  Aucun finding Critical ou Important ne reste.
- `pnpm check` passe avec 28 tests shared, 29 backend et 23 web (80 tests), puis
  les builds client et SSR. `convex dev --once` a préparé avec succès les
  fonctions du déploiement de développement. Dans le navigateur intégré et le
  compte artiste existant, l’album vide a préselectionné son contexte dans le
  nouveau morceau, enregistré le brouillon `[TEST] Parcours album 2026-10-24`,
  redirigé vers son aperçu et affiché immédiatement cette piste en position 1
  avec le statut Brouillon dans l’album.
- État Git de cette extension : branche `codex/album-workflow`, commit principal
  `be59773`, corrections de revue `087ac16`; le diff
  `a6cca538...087ac16` est non vide et constitue la base de revue complète.
- Raffinement album du 2026-10-24, basé sur `687d75a` : le Studio utilise
  désormais `@convex-dev/aggregate` pour les listes paginées, les filtres par
  statut, les compteurs et l’ordre des pistes. Cinq projections nommées sont
  maintenues transactionnellement par des triggers idempotents, avec un backfill
  borné et relançable documenté. Le backfill de développement a indexé les cinq
  morceaux existants puis poursuivi albums et pistes ; la liste a retrouvé
  l’album et ses quatre morceaux.
- L’aperçu album suit le design compact desktop/mobile retenu : bouton Publier
  visible sur un brouillon, menu d’actions, artiste, compteur Aggregate, date et
  statut, description pleine largeur sur mobile, liste prioritaire et détails
  après les morceaux. Le propriétaire peut réordonner directement avec
  glisser-déposer, clavier ou boutons haut/bas également visibles sur mobile.
  Les retours conservent maintenant leur contexte jusque dans l’aperçu et
  l’édition d’un morceau ouvert depuis un album.
- Le Studio présente des onglets explicitement contrastés, les filtres
  Tous/Brouillons/Publiés, des lignes compactes, un menu mobile et le bouton
  Créer flottant en vue étroite. La navbar n’a pas été modifiée. La publication
  artiste ne demande plus une attestation répétée ; cette confirmation reste une
  responsabilité du futur parcours de proposition fan.
- Revue locale du diff `687d75a...ad26536` : l’attribut d’état Radix des onglets
  et l’absence initiale des flèches de réordonnancement sur mobile ont été
  corrigés. La revue finale Standards/Spec et la revue Convex ne laissent aucun
  défaut bloquant, Critical ou Important. Les lectures supplémentaires des
  lignes Studio restent bornées par page et sont acceptées pour conserver les
  projections publiques minimales.
- Vérification : `pnpm check` passe avec 28 tests shared, 30 backend et 23 web
  (81 tests), lint, TypeScript et builds client/SSR. `convex dev --once` a préparé
  les fonctions du déploiement de développement ; le backfill Aggregate a été
  exécuté. Le navigateur intégré Codex a vérifié Studio et aperçu album en
  desktop et à 390×844, les filtres, le bouton Créer flottant, les contrôles
  d’ordre mobiles et le retour morceau → album, sans erreur console.
- Ajustement visuel final du Studio : l’action mobile n’est plus fixée au
  viewport et ne recouvre donc plus le footer. Elle suit maintenant la liste,
  juste avant le footer, avec le libellé contextuel `+ Morceau` ou `+ Album` ;
  l’action desktop conserve son libellé complet en haut de la liste. La revue
  locale ne relève aucun écart Standards/Spec et la revue Convex n’est pas
  applicable. `pnpm check` reste vert avec 81 tests et les deux variantes ont
  été contrôlées à largeur mobile dans le navigateur intégré, footer visible.
- Reprise du formulaire et correctifs du 2026-10-24, base de revue `a62bb8d` :
  le checkpoint `3ea2ada` est repris puis revu intégralement. Le formulaire de
  morceau réunit maintenant contexte single/album, titre, artiste et paroles,
  puis trois volets repliables pour sortie/présentation, crédits/collaborations
  et écoute. Les valeurs restent présentes après fermeture/réouverture. L’aperçu
  en lecture seule intégré au formulaire et son composant inutilisé sont retirés ;
  le rendu de la page du morceau continue de parser le texte canonique.
- `primaryLanguage` est facultatif dans le schéma, les entrées et les projections
  publiques. Le champ n’est plus demandé dans l’éditeur de morceau ; les valeurs
  historiques et l’héritage d’album sont conservés. Les paroles vides ou composées
  d’espaces sont refusées à la création, à l’édition et à la publication des
  anciens brouillons. La compatibilité de lecture des anciens enregistrements
  et le backfill restent inchangés.
- Le bouton mobile `+ Morceau` / `+ Album` est à nouveau fixe, selon le dernier
  retour utilisateur. Sur le Studio, la zone principale occupe au moins l’écran
  sous la navbar : le footer ne se montre qu’en défilant. Un espace mobile en bas
  du footer évite que son texte soit couvert lorsque le bas de page est atteint.
  Le menu mobile utilise une variante primaire partagée pour le fond, le texte
  et l’icône de Publier ; Modifier garde sa variante neutre.
- Revue locale Standards/Spec et revue `convex:convex-reviewer` : les légendes
  des groupes de formulaire ont été séparées correctement ; le contrôle des
  paroles a été ajouté au chemin de publication des anciens brouillons. Aucune
  violation bloquante, Critical ou Important ne reste. Les mutations gardent
  leur autorisation artiste/propriétaire ; la projection publique accepte
  l’absence de langue sans exposer de champ privé.
- Vérification : `pnpm check` passe avec 28 tests shared, 31 backend et 24 web
  (83 tests), lint, TypeScript et builds client/SSR. La synchronisation
  `convex dev --once` du déploiement de développement a confirmé
  `Convex functions ready!`. Le navigateur intégré a vérifié le nouveau
  formulaire, la conservation des champs repliés et l’absence d’aperçu/langue.
  À 390×844, le footer du Studio démarre à 844 px ; en bas de page son texte
  finit à 764 px et le bouton fixe commence à 796 px, sans recouvrement ni
  débordement horizontal. Le fond primaire et le contraste texte/icône ont été
  contrôlés visuellement et via les styles calculés. Les anciennes erreurs HMR
  ont été distinguées d’un rechargement propre avant le contrôle console final.
- CI GitHub Actions ajoutée le 2026-10-24 à la demande utilisateur :
  `.github/workflows/ci.yml` exécute `pnpm install --frozen-lockfile` puis
  `pnpm check` sur les PR vers `main`, les pushes vers `main` et à la demande.
  Node 22 et le pnpm du `packageManager` sont utilisés, avec cache des
  dépendances, annulation des exécutions dépassées, limite de 15 minutes et
  permissions `contents: read`. Les trois actions sont épinglées sur des
  commits officiels vérifiés. Aucun secret ni déploiement n’est inclus.
- Revue locale du workflow : YAML validé, déclencheurs et commande vérifiés,
  aucun défaut bloquant. Aucun fichier Convex n’est modifié dans cet ajout ;
  sa revue spécifique est non applicable. L’installation figée et `pnpm check`
  passent localement (83 tests et builds client/SSR ; résultats Turbo réutilisés
  pour le code inchangé). La première exécution hébergée sera déclenchée par
  l’ouverture de la PR `codex/album-workflow` vers `main`, autorisée par
  l’utilisateur ; son résultat doit être distingué de la validation locale.
- Les cartes du Studio ouvrent désormais directement l’aperçu sur toute la
  ligne ; les actions Modifier/Publier et le menu restent isolés du lien, et
  l’action Aperçu a été retirée des vues desktop et mobile. Les clics directs
  morceau et album ont été vérifiés dans le navigateur intégré, puis `pnpm
  check` a repassé avec 81 tests et les builds client/SSR.
- Les actions de publication sont maintenant différenciées visuellement par
  leurs icônes : envoi pour Publier et masquage pour Dépublier, dans le bouton
  desktop comme dans le menu mobile.

### Lot 4 — Catalogue artiste (complete)

- Ajout des brouillons de morceaux et d’albums, de l’édition, des aperçus,
  de la publication/dépublication, des paroles structurées avec identifiants
  stables, des pochettes et de l’ordre des pistes.
- Le formulaire de morceau utilise TanStack Form en trois étapes. Les champs
  obligatoires de l’étape Informations bloquent la progression, affichent leur
  erreur et reprennent le focus. Les sections et lignes peuvent être déplacées
  sans perdre leurs identifiants.
- L’onboarding présente désormais Fan et Artiste sous forme de choix explicites.
  Les champs facultatifs sont annoncés comme tels dans l’onboarding, le profil
  et les éditeurs de catalogue. Les onglets Studio et les CTA de l’accueil
  suivent correctement l’orientation et l’état de session.
- Les mises à jour de métadonnées et de pistes d’un album sont atomiques. Les
  contenus publiés d’un membre suspendu ne sont plus publics. Une pochette est
  validée puis enregistrée sur son intention avant l’attachement ; une intention
  expirée supprime le fichier enregistré mais non attaché.
- Les listes Studio utilisent la pagination Convex native et restent donc
  accessibles au-delà de 100 éléments. Un cron Convex horaire unique nettoie
  les uploads orphelins, y compris ceux envoyés tard pendant la validité de
  l’URL, et parcourt toutes les pages de stockage sans multiplier les balayages
  par intention.
- La publication exige une attestation explicite des droits ou autorisations
  nécessaires pour le contenu, les paroles et la pochette. Cette attestation est
  validée côté Convex et horodatée sur le morceau ou l’album. Toute modification
  de contenu, de pistes ou de pochette remet l’élément en brouillon et exige une
  nouvelle attestation avant republication.
- Les erreurs catalogue sont localisées et persistantes, et les écrans de détail
  disposent d’un repli localisé au lieu de laisser remonter une erreur racine.
- Vérification navigateur : accueil authentifié sans CTA d’authentification,
  validation et focus de la première étape, onglets Studio horizontaux, aucun
  débordement à 390 px. `pnpm check` passe avec 57 tests et les builds client/SSR.
- Après synchronisation avec `convex dev --once`, le Studio paginé a été rechargé
  dans le navigateur : l’erreur de contrat obsolète a disparu et les onglets,
  l’état vide et les actions sont de nouveau visibles.
- La clôture obligatoire rapporte 0 violation Standards, 0 défaut ou scope creep
  Spec, et 0 finding Convex Critical ou Important. Les suggestions restantes et
  leurs arbitrages sont consignés ci-dessous.
- Git de clôture : branche `feat/artist-catalogue-albums`, base de revue
  `f990788`, commit d’implémentation final `3b9825d`. Le commit documentaire de
  clôture le suit sans modification du produit.
- Correctif post-clôture du 2026-10-22 : les routes parentes d’un morceau et
  d’un album rendent désormais leur route enfant, tandis que l’éditeur réside
  dans une route index dédiée. Le bouton Aperçu affiche donc bien l’aperçu au
  lieu de réafficher le formulaire, et une création ou une modification réussie
  redirige vers cet aperçu. `pnpm check` reste vert avec 57 tests et les builds
  client/SSR. La revue locale du diff ne relève aucun défaut ; la revue Convex
  est non applicable car aucun fichier Convex n’a changé. La vérification
  visuelle finale avec un contenu appartenant à l’utilisateur lui est laissée,
  à sa demande. Commit du correctif : `cfd0f7d`.
- Correctif visuel post-clôture du 2026-10-23 : dans l’aperçu d’un morceau,
  la description mobile occupe toute la largeur sous l’en-tête, le badge
  Aperçu rejoint Retour, et le menu shadcn « Plus d’options » à droite regroupe
  Modifier et Supprimer. Sous 1024 px, la carte Écouter est repliée par défaut
  puis s’ouvre au clic ; l’onglet actif conserve un contraste explicite.
  Vérification manuelle dans le navigateur intégré Codex uniquement, à la
  demande de l’utilisateur ; aucun script de contrôle n’a été lancé.
- Ajustement visuel complémentaire du 2026-10-23 : le déclencheur « Plus
  d’options » est désormais un bouton ghost de 24 px sans bordure, et son menu
  est centré sous le bouton. Vérifié dans le navigateur intégré uniquement ;
  aucun script de contrôle n’a été lancé.
- Ajustement de placement du 2026-10-23 : le menu « Plus d’options » est aligné
  sur le bord droit de son déclencheur et se déploie vers la gauche. La taille
  `icon-lg` choisie par l’utilisateur est préservée. Vérifié dans le navigateur
  intégré uniquement ; aucun script de contrôle n’a été lancé.

#### Décision post-lot — éditeur de paroles du lot 5

- Le lot 4 conserve son éditeur structuré historique. Le lot 5 le remplacera
  par un seul `textarea` : le texte brut, les retours à la ligne et les en-têtes
  comme `[Couplet 1]` ou `[Refrain]` sont la source d’auteur. Il ne s’agit plus
  d’un import `.txt` séparé, ni d’un ensemble d’inputs ligne par ligne.
- Un parseur pourra présenter une validation ou un aperçu non modifiable, avec
  les en-têtes inconnus comme sections personnalisées. Les corrections se font
  toujours dans le même `textarea`; les PDF et l’OCR ne font pas partie de ce
  lot.

#### Idée différée — carnet d’écriture avec audio local

- Ne pas intégrer dans le lot 4. Distinguer ce futur **carnet d’écriture** du
  carnet V1 de passages sauvegardés : il contiendrait des textes libres privés,
  autosauvegardés, nommables et classables en idée, brouillon ou archive. Une
  note pourrait ensuite être transformée ou liée à un brouillon de morceau sans
  publication automatique.
- Prévoir un mode d’écriture sans audio en priorité : sauvegarde automatique,
  historique léger, compteur, recherche et fonctionnement hors ligne sur
  mobile. Le texte reste synchronisé dans Convex ; aucune note n’est publique.
- Pour accompagner l’écriture, parler d’**attacher un audio local** plutôt que
  de l’importer : le lecteur garde seulement une référence locale et ses
  métadonnées, sans envoyer ni dupliquer le MP3 dans Convex. Afficher un petit
  lecteur persistant avec lecture/pause, déplacement, vitesse et boucle A–B
  pendant que l’éditeur reste utilisable.
- Sur le Web, un fichier choisi sans téléversement ne peut être garanti après
  fermeture de la page ; il faudra éventuellement le resélectionner. Réserver
  l’expérience persistante au client mobile, avec permission locale durable et
  demande de resélection si le fichier a été déplacé, supprimé ou si l’accès a
  expiré. Ne pas héberger d’audio dans Lyr’X et ne pas promettre de synchroniser
  le MP3 entre appareils.

#### Arbitrages de revue conservés

- Les petits composants `OptionalLabel` restent pour l’instant proches de
  chacun des quatre formulaires : leur extraction imposerait une API partagée
  uniquement pour un fragment de texte localisé. Les centraliser lorsqu’un
  troisième comportement, et pas seulement un troisième rendu, apparaît.
- La table de correspondance des types de sections reste dupliquée entre
  l’éditeur et l’aperçu afin de ne pas coupler leurs modèles de présentation.
  Extraire un module de domaine lorsque la lecture publique ajoutera un
  troisième consommateur.
- Les requêtes publiques utilisent encore les documents catalogue internes.
  Introduire des DTO publics minimaux avec le lot Découverte, quand leur contrat
  de recherche et de page publique sera défini, plutôt que figer aujourd’hui un
  second schéma incomplet. L’attestation et les identifiants techniques ne sont
  pas rendus visuellement.
- Le chemin réel upload → enregistrement → attachement a été déployé mais n’est
  pas revendiqué comme vérifié de bout en bout dans cette passe : `convex-test`
  ne conserve pas le type MIME du Blob. Garder ce contrôle d’intégration dans la
  checklist externe avant production.

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

- Built the initial Corail token pass from the TweakCN Caffeine baseline; the
  later user-directed correction below supersedes that baseline with Soft Pop
  while retaining the exact coral brand mark.
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
- The initial completion `pnpm check` passed formatting, lint, TypeScript, 38
  tests, and all production client and SSR builds before the final landing
  simplification below removed its obsolete account-state test.

### Lot 3 visual correction — 2026-10-21

- Replaced the landing hero's decorative blurred color treatment with a locally
  served AI-generated editorial studio photograph. The optimized WebP is 124 KB,
  has localized alternative text, and contains no product promise or readable
  embedded copy.
- Adopted the user-selected TweakCN Soft Pop tokens while retaining the exact
  coral Lyr'X brand mark. DM Sans Variable, Newsreader Variable, and Space Mono
  are self-hosted through Fontsource so the selected typography does not depend
  on a visitor's system fonts. Newsreader is limited to the landing display
  headline; the interface and long-form reading remain in DM Sans.
- Browser verification confirms the image loads at its intrinsic width, the
  computed body family is DM Sans Variable, no rendered element uses a CSS
  gradient, the post-reload console is clean, and the 390×844 layout has no
  horizontal overflow.
- The first corrective review found inaccessible light secondary/destructive
  contrast and hand-built feature-card surfaces. The fixes use accessible
  semantic pairs and the installed shadcn Card composition. Follow-up review
  then restored semantic `h2` headings and removed a typography override from
  `CardDescription`.
- Commits `d8ab13d` and `e3e1edd` completed the approved editorial composition:
  the existing photograph now fills a shorter borderless hero, the centered
  headline uses a smaller normal/italic Newsreader treatment, and the capsule
  header shares the hero's content width. The redundant landing account card
  and its obsolete backend-limitation test were removed; account state remains
  available through the header and dedicated account routes.
- The mandatory follow-up gate reviewed `ebdaab7...HEAD`. Its first pass found
  only stale typography and verification documentation; after correction, the
  Standards re-review reports 0 hard violations and 0 judgement calls, and the
  Spec re-review reports 0 remaining or new findings and 0 scope creep. No file
  under `packages/backend/convex/` changed, so the Convex review is not
  applicable.
- The final Standards re-review reports 0 hard violations and 0 judgement calls.
  The final Spec re-review reports 0 remaining or new findings and 0 scope creep.
  Lot 3 still changes no Convex file, so its Convex review remains not
  applicable.
- `pnpm check` passes formatting, lint, TypeScript, 37 tests, and all production
  client and SSR builds after the final corrections.

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

Lot 8 is implemented and reviewed on `codex/lot8-public-search`. The user creates
and reviews the prepared PR, then decides whether to merge. Lot 9 (likes,
comments and reports) requires separate approval and has not begun. Production
deployment and account/role changes remain unauthorized. Historical proposals
for artist claim/replacement, notebook audio and sharing-card refinements retain
their deferred status. See [lot8-verification.md](lot8-verification.md) for actual
search limits and evidence.
