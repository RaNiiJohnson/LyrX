# Refactor route composition and eliminate redundant navigation auth waits

## Summary

```text
routes/       page composition, URL dependencies, public loaders/readers
features/     filters, profile blocks, reporting, editors and private workflows
root loader   one initial auth token; live auth remains in the provider
```

Public home/list/detail pages now expose their composition in the real routes.
Loaders and Suspense readers share Convex query arguments/cache; intent preload
remains enabled. Separate Router/Query devtools are available only in development.
The root configuration notice replaces repeated BackendRequired wrappers.

## Evidence

- **Before:** the real root auth handler ran three times for visit/preload/click;
  cold navigation could keep the previous page without feedback for one second.
  **After:** one initial token read, pending feedback after 150 ms, no forced
  minimum skeleton duration; regression tests exercise the actual configuration.
- `pnpm check`: formatting, lint, types, **439 passing tests**, client/SSR builds.
  Production artifact scan confirms no devtool modules or temporary diagnostics.
- Chrome: both floating devtools, matching cache entries before navigation,
  desktop and 390×844 Albums. On the same actual album card, a completed hover
  preload led to a 2.9 ms cached loader and ~88 ms click-to-commit. The cold
  sample spent ~3.8 seconds awaiting Convex; network failures were intermittent.
  These are development observations, not production performance claims.
- Primary-agent full local standards/specification review from `940129c`.
  Convex review is not applicable: no backend function/schema changes.
  See `docs/pre-lot10-verification.md` for evidence boundaries.

## Merge Danger

**Door:** two-way

Frontend refactoring and navigation initialization changes; no schema migration.
The existing backend domain split, permissions, pagination and aggregates remain.

**Blast Radius:** web

Public navigation/data loading, initial auth token seeding and shared feature
composition. Cold network requests still require data before rendering. Optional
and protected reads retain their existing session gates. Lot 10 is unstarted.
