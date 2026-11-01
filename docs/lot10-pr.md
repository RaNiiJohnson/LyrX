# Add a private lyric notebook with source-aware saved passages

## Summary

```text
Public Artist/Fan song
└── Select passage → save to private default/custom collection
    └── /notebook → move, remove, return to source
        ├── changed lyrics → explicitly labelled saved version
        └── withdrawn source → unavailable entry + bounded snapshot redaction
```

Adds an account-private notebook with exact source ranges, version fingerprints,
collection management and responsive FR/EN UI using the existing Caffeine theme.
All notebook APIs enforce active-member ownership, including for administrators.
Sharing-card generation remains in lot 11.

## Evidence

- **Before:** no private passage-saving or notebook route.
  **After:** real development save/read/cleanup journey and desktop/mobile browser
  checks; privacy, source lifecycle, concurrency, pagination and account cleanup
  verified in isolated tests. See [verification](lot10-verification.md).
- `pnpm check` passes formatting, lint, types, 462 tests and production builds.
  Local standards/specification and Convex review have no unresolved blocker.

## Merge Danger

**Door:** one-way for snapshot redaction.

Tables are additive with no backfill. Source withdrawal permanently clears saved
snapshot text in bounded jobs. Rollback must retain new tables/data and account
for pending cleanup jobs. Existing publication content is not rewritten.

**Blast Radius:** notebook.

Public song actions, account navigation, three new tables, existing source/owner
triggers and account cleanup are affected. No push, PR creation, merge or production
deployment is included in this local delivery.
