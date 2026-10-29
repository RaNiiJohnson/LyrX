# Lot 9 pull request proposal

Title: `Add song likes, flat comments and private comment moderation`

Base: `main` · Compare: `codex/lot9-song-interactions`

Local proposal: automated checks are current; final visual acceptance remains
open because the browser tool cannot reach local development. No PR creation or
branch push is claimed.

---

## Summary

Public Artist/Fan song readers now support likes and comments. Members see a
private liked-song list, delete their own comments and report others; admins
resolve existing private reports with a reason. Reports alone never hide text.

```text
Public song → canonical eligibility → likes + chronological comment pages
Member session → desired-state like / idempotent comment / private report
Admin session → reported comment → dismiss or erase text + decision
Source/account deletion → immediate read exclusion → bounded cleanup
```

The supplied comment design is implemented with avatar rows, ellipsis actions,
a 500-character inline composer, compact borderless reactions and categorized
reports with optional details. The existing Caffeine UI and FR/EN are preserved.
Likes/comments use client-side React `useOptimistic` for immediate feedback,
rollback and reconciliation with live Convex data. Deferred-request tests cover
failures, overlapping Actions and source/session changes. Interactive forms use
TanStack Form and shadcn primitives; Studio previews and album pages remain
outside scope.

## Evidence

- **Before:** no working song likes/comments or private liked-song list.
  **After:** both public origins share authorized, reactive interaction journeys.
- `pnpm check`: formatting, lint, types, **436 tests** (29 shared, 105 backend,
  302 web), production client and SSR builds pass.
- Primary full-diff local review from `e6d6822` and Convex security/performance/
  quality review: no blocking findings.
- Development Convex push succeeded after a transient network failure; additive
  tables require no historical backfill. Production was not deployed.
- Earlier browser evidence (before the latest visual refinement): reversible
  like/unlike and private-list check, public Artist/Fan
  integration, nonadmin refusal, FR/EN, light/dark, mobile layout, report-dialog
  focus/Escape/cancellation. No live comment/report publication or destructive
  moderation was used to manufacture evidence.
- Final visual validation remains open: the available browser tool cannot reach
  localhost. No new-design browser acceptance is claimed.
- Isolated fixtures cover concurrent retries, visibility/revocation, forgery,
  private report access, decisions, text/page/rate limits and cleanup recovery.

Real limits: one counter per source can contend under high write concentration;
cleanup is eventual; tombstones preserve deduplication without comment text;
popularity remains the existing recent-view metric. Live admin/cross-account
moderation and physical devices are not claimed. See `docs/lot9-verification.md`.

## Merge Danger

**Door:** two-way for application code; one-way for subsequent text-erasure actions.

New tables are additive. Rolling code back cannot recover text a member or admin
has deliberately erased. Source/account cleanup preserves current authorization
and anonymized foreign audit decisions.

**Blast Radius:** Interactions

Public song details, member navigation, private liked pages, comment-report
administration and account/source cleanup. No account/role changes, production
publication, dependency upgrades or lot 10 work.
