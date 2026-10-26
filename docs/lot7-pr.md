## Summary

```text
Artist songs + Fan contributions
  → visibility-maintained public projection + Aggregate
    → one ordered catalogue, exact counts and numbered URL pages
    → bounded home / artist / album selections
```

- Add deduplicated, signed-in, non-self views over seven UTC days for real recent-view ranking.
- Apply the approved layouts while retaining Caffeine: local catalogue tabs, role-aware header/mobile navigation, grouped account Sheet, compact image controls and circular profile avatar.
- Keep one lyric textarea with optional localized Intro/Verse/Chorus/Bridge/Outro insertion and native undo. Preserve ownership, attribution, moderation and existing detail links.
- Search remains explicitly unavailable until lot 8; no likes, notebooks, sharing or artist claim flow is introduced.

## Evidence

- **Before:** public catalogue discovery and the approved responsive layouts were not implemented; the follow-up exposed duplicate navigation, bulky image controls and a stretched avatar.
  **After:** `pnpm check` passes formatting, lint, TypeScript, **373 tests** (29 shared / 83 backend / 261 web) and client/SSR production builds. Primary entire-lot local review and Convex review have no blocking findings.
- **Before:** historical public sources had no discovery projection.
  **After:** authorized development backfill is initialized with no pending jobs; anonymous live counts agree with the existing dataset. Mixed-origin boundaries, lifecycle cleanup, ranking deduplication/expiry and recovery are covered by isolated tests, not invented live publications.
- **After:** desktop/mobile, FR/dark and EN/light browser checks cover catalogue navigation, account Sheet keyboard/focus/router behavior, 96px avatar, equal 36px header controls and native lyric insertion/undo. Fresh-tab console is clear. Detailed evidence and limits: [docs/lot7-verification.md](lot7-verification.md).

## Merge Danger

**Door:** Two-way application changes; additive Convex tables/components require the documented discovery backfill on the intended deployment. Discovery stays in a loading state until initialization and owner refresh jobs complete. No destructive migration or production deployment was performed.

**Blast Radius:** Discovery

Public counts, ordering, eligibility maintenance, view telemetry and the shared web shell/forms are affected. Numbered pages remain reactive, not snapshots. View ranking excludes anonymous/self views and is not playback. Live external-player success and physical-device/cross-engine testing are not claimed. Lot 5, T1 and lot 6 remain merged and closed.
