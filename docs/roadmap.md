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
| 7. Public pages and discovery | Public artist, album, and song pages plus recent/popular discovery | Visibility, pagination, ranking, and external-player checks |
| 8. Catalogue and lyrics search | Search published titles, artists, albums, genres, and supported lyrics terms with excerpts | Search capability/limit tests and no-private-data proof |
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
on `codex/account-self-deletion`; the unfinished lot 6 implementation is saved
at `1298ef1`. Resume that branch only after this prerequisite, and extend the
cascade to the community domain before closing lot 6. Lot 5 and T1 stay closed.

Lots 2–12 stabilize the web and shared backend before Expo. Search follows the
public content model so its visibility rules are testable. Notebook excerpts and
sharing both depend on a source-text snapshot. Visual-card generation waits
until managed image access and withdrawal rules exist.
