## Summary

```text
Artist songs + Fan contributions
  → visibility-maintained public projection + Aggregate
    → one ordered catalogue, exact counts and numbered URL pages
    → bounded home / artist / album selections
```

- Add deduplicated, signed-in, non-self views over seven UTC days for real recent-view ranking.
- Retain Caffeine while applying responsive layouts: local catalogue tabs, role-aware navigation, account Sheet, compact image controls, avatar/banner overlap, underlined profile tabs and a top public-profile action.
- Keep one lyric textarea with localized Intro/Verse/Chorus/Bridge/Outro insertion and native undo. Preserve ownership, attribution and moderation. Search stays deferred to lot 8.

## Evidence

- **Before:** no unified discovery; duplicated navigation, stretched avatar and inactive tab underline styling.
  **After:** `pnpm check` passes formatting, lint, TypeScript, **380 tests** (29 shared / 83 backend / 268 web) and client/SSR builds. Primary local review and Convex review have no blocking findings.
- **After:** development backfill initialized, no pending jobs; live public counts match existing content. Isolated tests cover mixed-origin pagination, lifecycle cleanup, ranking and recovery without invented live publications.
- **After:** desktop/mobile, FR/dark and EN/light checks cover navigation, keyboard/focus, image sizing and native lyric undo. See [verification and limits](lot7-verification.md).

## Merge Danger

**Door:** Two-way application changes. Additive Convex tables/components require the documented backfill on the intended deployment; discovery waits for initialization/refresh jobs. No destructive migration or production deployment was performed.

**Blast Radius:** Discovery

Public eligibility, counts, ordering, telemetry and shared layouts are affected. Pages are reactive, not snapshots; view ranking is not playback. Live player success and physical-device/cross-engine testing are not claimed. No later lot is included; lots 5, T1 and 6 remain closed.
