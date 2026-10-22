# Delivery roadmap

Each lot is a coherent future PR. A lot is complete only after implementation,
relevant automated and manual checks, independent review, documentation, and a
cleanly identifiable Git state. The mandatory independent-review procedure is
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
| 6. Fan proposals and admin validation | Fans submit private songs/artwork; admins accept or refuse once with a reason | Privacy and idempotent moderation tests |
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

Lots 2–12 stabilize the web and shared backend before Expo. Search follows the
public content model so its visibility rules are testable. Notebook excerpts and
sharing both depend on a source-text snapshot. Visual-card generation waits
until managed image access and withdrawal rules exist.
