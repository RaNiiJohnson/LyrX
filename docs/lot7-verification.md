# Lot 7 verification — 26 October 2026

**Final local evidence**, including the user's visual follow-up and subsequent
navigation/spacing corrections. Root `pnpm check` passes **373 tests** (29 shared,
83 backend, 261 web), formatting, lint, TypeScript and client/SSR production
builds. No PR creation, merge or production deployment is claimed.

Branch: `codex/public-discovery-layouts`. Fixed review base: `9f83883`
(merged lot 6, PR #4). `06deac9` adopts the approved design/roadmap documents;
`4609f8a` is the recoverable quota checkpoint, not a completed lot.
`2e48b37` is the second remote checkpoint; its pending visual work is now resolved.

## Delivered scope

- Unified public Artist/Fan song ordering, totals, numbered pages and URL filters.
  Origin badges do not confer identity verification or catalogue ownership.
- Bounded home rows and artist catalogues, real recent-view ranking, public
  album/artist lists and preserved contribution detail/author/moderation routes.
  `/community` redirects to `/songs`; search explicitly remains unavailable.
- Current Caffeine tokens, colors and typography retained. Shared role-aware
  header/mobile navigation, normal-flow desktop footer, mobile clearance,
  signup/profile layouts, Studio tabs/action and canonical lyric form adapted.
- The user's final form correction removes the essentials heading/introduction;
  Single/Album toggles and identity/lyrics are direct, with compact artwork and
  optional metadata/actions in the desktop side column. Optional details use
  container breakpoints so their narrow-column controls cannot overflow.
- Local underlined catalogue navigation remains below title/count; the header
  has only Home plus role tools, not duplicate catalogue links. Account navigation
  uses a grouped shadcn Sheet. Language/theme/account targets are all 36px, with
  6px gaps. Minimal artwork controls and a real circular avatar replace bulky
  upload cards/native controls and the stretched profile capsule.
- Intro/Outro join Verse/Chorus/Bridge in both locales and Artist/Fan editors.
  Explicit pending/read-only props disable heading tools immediately.

## Primary local review

The primary agent reviewed the entire local lot diff from `9f83883`, including
the checkpoint, subsequent fixes, tests, generated API/routes and documentation.
The mandatory final review was not delegated. Convex reviewer passes covered
authorization/validators, public projections, lifecycle/cascade maintenance,
bounded reads, Aggregate coherence, scheduling, types and reactivity.

Corrections made during implementation/review:

- Fixed unchecked array accesses and fixture IDs that blocked TypeScript.
- Replaced large synchronous public-projection fan-out for album inheritance
  with a durable owner refresh; source/Studio writes retain their atomicity.
- Removed the optional discovery album track count, avoiding up to 24 × 100
  complete song/lyric reads on an album list. Album detail still lists real tracks.
- Fixed horizontal arrows surviving a transition to an empty row, failed banner
  state surviving a replacement URL, helper contrast over the light-mode hero,
  and sidebar optional-field overflow.
- Added real Radix/router filter and Studio interactions, native heading/caret
  tests, safe telemetry tests, image fallback and external-player fallback tests.
- Re-reviewed all visual follow-up files, including the shared image chooser,
  title-focused Sheet, Radix state animation selectors, role-only header,
  equal-sized preference controls and actual local catalogue router links.

No blocking standards/specification or Critical/Important Convex finding remains.

## Automated and development evidence

- Root `pnpm check`: formatting, lint, TypeScript, shared/backend/web tests and
  production client/SSR builds. Exact final totals are recorded in progress.
- Discovery backend covers mixed-origin ordering/page boundaries/ties, filters,
  private-field exclusion, moderation, source deletion, account withdrawal,
  suspension/recovery, historical idempotent backfill, large inheritance, view
  rate limits/deduplication/expiry and bounded viewer/source cleanup.
- Development `convex dev --once` succeeded. The authorized development backfill
  finished with `initialized:true,pendingJobs:0`, no discovery jobs remaining.
  Anonymous live queries return `ready:true`: three public Fan contributions,
  zero published official albums/songs, one artist. Home selections and list
  totals agree. No synthetic publication was added to manufacture a mixed list.
- YouTube/Spotify DOM checks prove on-demand iframe creation, no autoplay and a
  retained source link when iframe loading is blocked. Happy DOM intentionally
  disables remote iframe loading; its expected blocked-load diagnostics are not
  evidence of successful provider playback.

## Browser evidence

- Chromium desktop 1280 × 900 and mobile 390 × 844: home, public songs/artists,
  empty album catalogue, artist profile, community attribution and role-aware
  Artist/admin navigation. The separate Fan session's home/navigation and origin
  filter were checked before the user resumed using that tab.
- French/dark and English/light views exercised. Search remains disabled with
  a readable availability message, real/missing artwork renders, official-only
  filtering yields the genuine zero count, and the legacy public listing redirects.
- Studio tabs measure equal 176 px widths in a 358 px mobile action row. Switching
  to Albums changes the in-flow creation target. The mobile footer is hidden;
  form actions end at 747.5 px above the navigation's 779 px top. No page-wide
  horizontal overflow was observed, including expanded listening fields.
- In the unsaved new-song form, native heading insertion retained the surrounding
  lyrics, restored focus/caret, replaced only the selected range, and Ctrl+Z
  restored the previous source. No draft was submitted. Persistent optional
  heading guidance remains visible after typing.
- Test-tab console read returned no errors or warnings. Account roles and real
  content were not changed; no account deletion or production operation occurred.
- Follow-up Fan checks used a separate background tab: avatar measured 96×96px;
  artwork browse opened the native single-file chooser with Enter without an
  upload. FR/dark and EN/light heading insertion, native Ctrl+Z, mobile wrapping,
  Sheet Tab/Shift+Tab trap, Escape and trigger focus restoration passed. Real
  Sheet links closed the panel and navigated; local Albums links set the active
  underline and showed the genuine zero total. Header targets measured 36×36px
  at x=254/296/338 on a 390px viewport, with no horizontal page overflow.
- A transient hydration diagnostic during concurrent hot edits compared old
  server markup with new header markup. A fresh tab after edits settled had no
  errors/warnings, including Sheet navigation to Albums. The Chrome Artist
  session later required sign-in; final Artist-specific image/pending states use
  isolated tests in addition to the earlier live Artist evidence. No account was
  reauthenticated, modified or deleted to manufacture final evidence. Temporary
  viewport and locale/theme changes were restored.

## Accepted limits and next boundary

- Eligibility/backfill jobs temporarily gate the whole discovery projection to
  keep counts and entries consistent. Recovery is durable; loading is not a fake
  empty result. Numbered pages are reactive, not snapshots.
- View ranking is verified-member, non-self, per-source/day over seven UTC days,
  not playback, anonymous traffic or likes. Expiry/recovery may lag briefly while
  bounded batches drain. Anonymous reading is still public.
- Mixed official/Fan pages, large overflow rows, destructive lifecycle paths,
  anonymous/unverified/suspended UI, signup and failure states use isolated tests
  when the live dataset/session cannot safely exercise them. No successful live
  external playback, physical keyboard/device or cross-engine matrix is claimed.
- Native undo tools are hidden if supported `insertText` is unavailable; plain
  canonical textarea editing and validation remain available.
- Public list loading is reactive client data; existing detail/profile SSR is
  retained. No new catalogue SSR or lyric excerpt/search capability is claimed.
- Search, likes/comments, notebooks, sharing and artist claim/replacement stay in
  later lots. No lot 8, production deploy, merge or PR creation is authorized.
  Push and English PR preparation in Chrome are authorized; stop before Create.
