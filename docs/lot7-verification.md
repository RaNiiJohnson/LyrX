# Lot 7 verification — 26 October 2026

**Intermediate evidence only.** The user supplied additional visual comments
after this review and then requested a quota stop. They are still pending in
[the latest checkpoint](lot7-checkpoint.md); this record does not close lot 7.
Root `pnpm check` passed 339 tests (29 shared, 83 backend, 227 web) before those
new changes. Revalidate after implementing them.

Branch: `codex/public-discovery-layouts`. Fixed review base: `9f83883`
(merged lot 6, PR #4). `06deac9` adopts the approved design/roadmap documents;
`4609f8a` is the recoverable quota checkpoint, not a completed lot.

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
