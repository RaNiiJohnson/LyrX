# Delivery roadmap

Each lot is a coherent future PR. A lot is complete only after implementation,
relevant automated and manual checks, local review, documentation, and a
cleanly identifiable Git state. The mandatory review procedure is
defined in [the lot completion review gate](../.agents/rules/lot-completion.md).
No later lot starts without user approval.
The cross-lot product rules in [specification.md](specification.md) remain
authoritative throughout delivery.

| Lot | Outcome that can be tried | Main proof |
| --- | --- | --- |
| 1. Monorepo foundation | Install, run, and build a minimal Lyr'X web shell; navigate the documented repository | Root checks, production build, browser smoke test |
| 2. Backend, auth, roles, profiles | Email/password flows, prepared Google flow, artist/fan onboarding, profiles, server-only admin assignment | Auth/session tests and authorization matrix |
| 3. Corail shell, theme, i18n | Responsive French/English shell with light/dark/system themes and persisted choices | Browser matrix and accessibility checks |
| 4. Artist catalogue and albums | Artists draft, preview, publish, edit, unpublish, and order their own songs/albums | Ownership, lifecycle, stable-line, and album-order tests |
| 5. Web structure and lyric entry | Route-owned screens and data loading, feature-oriented web code, and one-textarea lyric authoring | Route/SSR/auth regression checks, raw-text/parser tests, and production build |
| T1. Catalogue modules and image upload optimization | Domain-oriented Convex catalogue and optimized avatar/banner/artwork uploads | Ownership/lifecycle/Aggregate regressions, image-processing checks, root gate and browser smoke test |
| 6. Community fan lyrics and report moderation | Fans publish attributed community lyrics without pre-approval; admins moderate only after reports | Attribution, public visibility, report/hide/remove, and cross-account authorization tests |
| 7. Public pages, unified discovery, and approved layouts | Apply necessary `design/` layouts using the current theme; public artist/album/song pages, unified Artist/Fan song lists with origin badges, bounded home rows, numbered catalogue pages, and a visibly deferred search entry | Cross-origin visibility/pagination/counts, responsive/role-aware layout, ranking, and external-player checks |
| 8. Catalogue and lyrics search | Search published titles, artists, albums, genres, and supported lyrics terms with excerpts through a navbar overlay; add the approved public musical-release home slider | Search capability/limit tests, no-private-data proof, accessible overlay and responsive slider checks |
| 9. Likes, comments, reports | Idempotent song likes, flat comments, deletion, reports, and admin intervention | Concurrency and moderation tests |
| 10. Private lyric notebook | Private saved excerpts, default/custom collections, source and unavailable states | Cross-account privacy and source-change tests |
| 11. Signed sharing cards | Preview and download a bounded vertical Lyr'X card with or without artwork | Rendering/export and withdrawn-content tests |
| 12. Web hardening and beta preparation | Complete legal/community launch drafts, error/loading states, security and cost review | Full acceptance matrix, builds, browser audit, independent review |
| 13. Expo foundation | Run a typed Expo app using shared contracts/tokens and the stabilized backend | Expo checks and device/emulator smoke test |
| 14. Mobile product journeys | Android-focused public, account, interaction, notebook, and sharing journeys | Native navigation, permissions, deep-link, and share tests |
| 15. Android release preparation | Produce and exercise the supported Android build path without publishing | EAS/native build evidence, install smoke test, release checklist |

## Dependency notes

Lot 5 is merged and closed on `main` (`b9b5c4d`, PR #1). Technical lot T1 is
also merged and closed (`80ade32`, PR #2). Its scope
is recorded in [the Hallohallo research](research/hallohallo-patterns-for-lyrx.md)
and [progress](progress.md). Lot 6 community lyrics were separately authorized
on 25 October 2026, replacing the former admin-approved proposal direction.
A new PR still requires the user's explicit authorization.

Before finishing lot 6, the user authorized a separate account prerequisite:
self-service Better Auth deletion with resumable cascade cleanup. It is isolated
on `codex/account-self-deletion`, completed with the redirect-flash fix at
`3da2c3e`. The user has now authorized resuming `codex/community-fan-lyrics`;
local merge `66b5d9f` integrates that prerequisite. The earlier checkpoint
`1298ef1` is historical. Community cleanup and the final verification/review
gate belonged to that resumed lot. Lot 6 and its follow-up are now merged in
PR #4 at `9f83883`. The user authorized lot 7 on
`codex/public-discovery-layouts`, based on that merge. Lot 5 and T1 stay closed.

The user's lot 7 design decisions were implemented in that lot. They replace a separate design lot and
the separate public Community listing: artist and Fan publications share public
song discovery, while their backend ownership/moderation domains remain separate.
The current Caffeine colors stay unchanged. Search UI is shown with an explicit
unavailable state in lot 7; search behavior stays in lot 8. This documentation
update originally recorded scope only. Actual lot 7 verification and completion
are recorded in [progress](progress.md). The user permits pushing the branch and
preparing an English PR description in Chrome, but retains the Create pull
request action. That earlier lot 7 delivery did not authorize lot 8 or production
deployment.

Lot 7 is now merged in PR #5 at `62dd6eb`. For the next implementation session,
the user approved [the lot 8 direction](lot8-direction.md): retain the implemented
design instead of the removed local references, implement navbar overlay search,
and add a home slider for existing public musical releases. Sub-agents are
limited to read-only, targeted research; the primary agent owns all edits and
completion review. Commit/push and preparing an English PR form in Chrome are
authorized in that implementation session; the user retains PR creation/merge.
This documentation session does not begin product implementation.

Lots 2–12 stabilize the web and shared backend before Expo. Search follows the
public content model so its visibility rules are testable. Notebook excerpts and
sharing both depend on a source-text snapshot. Visual-card generation waits
until managed image access and withdrawal rules exist.

Lot 8 implementation and actual capability limits are recorded in
[lot8-verification.md](lot8-verification.md). The user retains PR creation and
merge. Lot 9 requires a new approval and has not begun.
