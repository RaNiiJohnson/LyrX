# Lot 8 pull request draft

Title: `Add unified public search and an automatic release hero`

Base: `main` · Compare: `codex/lot8-public-search`

Chrome preparation was blocked on 27 October 2026: GitHub navigation repeatedly
timed out and remained blank, including the GitHub home page. The implementation
and follow-up are pushed; no pull request was created. Copy the body below into
the GitHub form when access is restored.

---

## Summary

Public discovery now searches Artist and Fan releases, artist profiles, albums,
genres and supported lyric terms from the navbar, with matching excerpts and
native cursor pagination. The home hero presents existing public releases with
automatic rotation, overlaid context/actions and accessible controls. The rounded
floating header keeps the existing Caffeine theme and navigation.

```text
Navbar search → 450 ms debounce / immediate submit
  → native public search index → canonical eligibility checks
  → bounded cards + Fan attribution + current lyric excerpt
Home public releases → six-slide hero → pause / indicators / detail links
```

Search resets stale results on input changes and handles loading, empty,
backfill, validation and technical failures separately in FR/EN. Public queries
recheck source visibility and author eligibility; publication, edits, moderation,
withdrawals and deletion maintain the existing projection lifecycle.

## Evidence

- **Before:** no unified lyric search; home used a static editorial hero.
  **After:** navbar overlay searches after a typing pause, with up to 12 results
  per native cursor page. Existing public releases replace the static hero.
- `pnpm check`: formatting, lint, TypeScript, **399 tests** (29 shared, 92 backend,
  278 web), production client and SSR builds pass.
- Primary-agent full-diff standards/specification review from `a6644da`, including
  follow-up changes; Convex security/performance/quality review: no blocking findings.
- Convex development index push and idempotent discovery backfill succeeded:
  `initialized:true, searchVersion:1, pendingJobs:0`.
- Browser checks: FR/EN, dark/light, desktop/mobile, small-height dialog scrolling,
  focus/Escape restoration, title/artist/lyric searches, debounced submission, prefix/OR
  behavior, empty/cleared results, Fan attribution and canonical detail navigation,
  hero rotation/indicators/arrows and mobile header layout.
- Isolated tests cover private/stale-source exclusion, suspension/revocation,
  withdrawals/moderation/deletion, source edits, cursor boundaries, versioned
  backfill, debounce cancellation, hero states and pause/reduced-motion behavior.

Actual limits: native search uses OR terms and a prefix on the last term only;
no arbitrary substring, exact phrase, typo correction, accent folding or Malagasy
stemming guarantee. There is no exhaustive total. Search is billed against index
size; public lyric text increases projection storage/read size. Live development
content supplied no official-song/album examples, so those paths have isolated
regression coverage. Connectivity was intermittent. See `docs/lot8-verification.md`.

## Merge Danger

**Door:** two-way

Application changes can be reverted. The additive search index/versioned
projection requires development/deployment index creation and the documented
backfill before search becomes ready. Production deployment was not performed.
No account/role changes or new publications were used for verification.

**Blast Radius:** Discovery

Public search/projection refresh, home presentation and shared header layout.
Write permissions remain enforced by existing server authorization. No lot 9 work.
