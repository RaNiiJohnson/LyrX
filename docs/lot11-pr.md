# Preview and download source-authorized Lyr'X lyric cards

## Summary

```text
Public Artist/Fan song or own notebook passage
└── Select current passage → bounded 9:16 canvas preview
    ├── managed blurred artwork or Corail studio background
    └── source/version checks → download the same canvas as PNG
```

Adds responsive FR/EN sharing cards with visible Lyr'X branding and current source
attribution. Changed notebook snapshots require reselection; unavailable sources
cannot produce new exports. Sharing is local PNG download, without publication or
native sharing. No schema change or new dependency.

## Evidence

- **Before:** no card preview or download action.
  **After:** a real authenticated song export and isolated plain/artwork PNGs,
  all verified as 1080×1920. Real responsive frames measured at 390 and 1440 px
  without horizontal overflow. [Verification](lot11-verification.md).
- Focused backend, DOM, layout and export tests cover privacy, source changes,
  final withdrawal rechecks and cancellation. `pnpm check` passes lint, types, 482 tests and production builds.
  Local and Convex reviews have no unresolved blocking finding.

## Merge Danger

**Door:** two-way for code; downloaded files cannot be recalled.

Read-only source queries, existing public-page/notebook entry points and client
canvas/export code. There are no tables, migrations or persisted export artifacts.
A source can change after the last server check; the client makes no DRM guarantee.

**Blast Radius:** sharing.

Based on the still-local lot 10 commit. Review that dependency before merging.
The user authorized a local commit; this proposal is documentation only.
Creating a PR and merging remain explicitly prohibited.
