# Architecture and decisions

## Required stack

- TypeScript throughout.
- pnpm workspaces at the repository root.
- TanStack Start for `apps/web`; it must not be replaced with Next.js.
- Convex for data, server functions, realtime queries, and application images.
- Better Auth for email/password and Google authentication.
- shadcn/ui source components for the web interface.
- TanStack Form for every interactive web form; fields and validation feedback
  compose the installed shadcn/ui primitives.
- Expo / React Native for `apps/mobile` after the web backend stabilizes.

## Repository boundaries

```text
apps/web/                 TanStack Start web application
apps/mobile/              Expo application (created in the mobile foundation lot)
packages/backend/         Convex project and Better Auth server integration
packages/shared/          Portable domain types, translations, and design tokens
docs/                     Product, architecture, research, delivery, and operations
```

Web components never cross into React Native. Only framework-neutral types,
translations, validation rules, and design tokens belong in `packages/shared`.
Both clients use one backend; security rules are enforced in Convex functions,
not duplicated as trust decisions in clients.

## Foundation decisions

1. Use one root lockfile and root commands so a clean checkout has one install
   and one verification entry point.
2. Keep applications and internal packages independently type-checkable and
   buildable through workspace scripts.
3. Commit example environment files only. Convex deployment data, Google OAuth,
   transactional email, hosting, EAS, and signing credentials remain external.
4. Defer schemas, auth tables, business functions, UI themes, and Expo scaffolding
   to the lots that can verify their behavior end to end.
5. Store implementation research under `docs/research/`; decisions in this file
   remain the concise source of truth.

## Account and profile decisions

1. Pin `@convex-dev/better-auth@0.12.5` with `better-auth@1.6.33`; keep the
   Better Auth component and generated schema local to the repository while the
   published adapter remains the integration boundary.
2. Proxy Better Auth through the TanStack Start catch-all route and isolate all
   server helpers from client modules. Google and transactional email are
   capability-gated from typed Convex environment values.
3. Store authentication users in the Better Auth component and product
   authorization in application tables: `members`, `profiles`, and
   `artistProfiles`. Fan/Artist, administrator, credited identity, and future
   verification badges remain separate concepts.
4. Require a verified email before onboarding and active-member authorization
   before profile writes. Suspended profiles disappear from public queries and
   every protected mutation rejects them server-side.
5. Keep first-admin assignment internal and single-use. No client-facing path
   can promote an account.
6. Store only Convex storage identifiers for avatar and banner images. An upload
   intent is short-lived, authenticated, rate-limited, and can accept only a
   storage object created during its lifetime. Persist ownership before
   attachment; delete a replaced object only when that ownership is proven and
   no profile still references it. Preserve an unowned client-supplied object
   rather than risk cross-account deletion. Resolve URLs only for public reads.
7. Use HTTPS allowlists for named social providers and HTTPS-only custom links.
   Public profile queries project only fields intended for anonymous readers.
8. Prefer an official Convex component whenever one covers the capability. The
   Resend component owns queued, durable, idempotent email delivery, and the
   Rate Limiter component protects upload-intent creation.
9. Let Better Auth implicitly link a trusted Google identity when its verified
   email matches. Do not duplicate that default flow with a profile-page linking
   button.
10. Account navigation and signed-out-only routes derive from the current Convex
    member state. Authenticated members are sent to verification, onboarding, or
    their account instead of seeing sign-in/sign-up actions again.
11. Use shadcn Skeleton only for data-dependent regions and Sonner to acknowledge
    asynchronous action success or failure. Keep durable, actionable errors in
    the page as well as in transient feedback.
12. The latest user-installed TweakCN Caffeine palette supersedes the earlier
    Soft Pop token baseline. Keep its
    typography self-hosted through Fontsource (`DM Sans Variable`, `Newsreader
    Variable`, and `Space Mono`). Reserve Newsreader for the landing display
    headline; interface and long-form reading remain in DM Sans. Reconcile the
    semantic tokens with the Lyr’X coral brand instead of scattering one-off
    colors through components.
13. A single hourly Convex cron scans `_storage` for uploads that remain
    unclaimed after the grace period, including uploads made near the end of the
    one-hour upload-URL lifetime. `storageIsClaimed` is therefore the exhaustive
    registry of every table that can retain a storage identifier. Any future
    storage-backed capability must extend that registry and its preservation
    tests before release; otherwise the global sweep must be replaced with a
    capability-scoped ownership record.
14. Self-deletion uses Better Auth's native `deleteUser` endpoint and its
    password/fresh-session protection. The component's transactional user
    `onDelete` trigger derives `issuer|subject`, matching Convex
    `tokenIdentifier`, then persists an identity revocation marker, suspends
    the member and schedules a durable cascade job. HTTP before/after-delete
    hooks are not used for application cleanup: they are separate calls.
15. `accounts/deletion.ts` cleans at most 25 dependent rows per batch (one song
    parent at a time), preserving Catalogue Aggregate triggers and consulting
    the exhaustive storage claim registry before deleting an owned file.
    Each batch and its continuation commit together. A five-minute cron resumes
    stalled jobs after failure; no public arbitrary-member deletion exists.
    The whole Better Auth deletion spans several adapter calls and the content
    cascade is eventual, not one giant atomic transaction. Revocation markers
    prevent signed but unexpired JWTs from onboarding or writing again; member
    state reads treat them as anonymous. New signup uses a new auth identity.

## Community domain boundary (lot 6)

`convex/community/` is independent of the artist catalogue. `write.ts` publishes
and edits Fan-owned contributions through `fanMutation`; `read.ts` owns public
projections, private author pagination and bounded duplicate warnings.
`moderation.ts` accepts private reports from active members and permits only
administrators to resolve an existing report with a reason. `model.ts` defines
the shared domain validators; `values.ts` centralizes text bounds, visibility
and rate limits. These functions never write official songs/albums or use the
artist mutation seam.

Public queries project only published content by active, verified members with
a profile. First-publication time stays stable across edits. Concurrent publish
retries use the author's indexed request identifier; edits and moderation check
the reviewed revision. Reports alone do not change visibility. Hide/remove
prevent the original contribution from being edited back into public view;
report decisions are audited transactionally and duplicate resolutions are
idempotent. Artist claim/replacement and general discovery search are deferred.

Account cleanup guards its final `member` phase with indexed, bounded community
cleanup, including old jobs already at that phase. It removes owned contributions
only after their reports/decisions are gone. Other authors' private audit history
survives with deleted member references anonymized and reporter text replaced;
moderation status is never restored by account deletion.

Web routes own the `/community` public/Fan screens and `/admin/community` report
screens; private data is not prefetched in public loaders. TanStack Form and
shadcn primitives provide required lyrics, duplicate confirmation, accessible
report/moderation forms and French/English feedback.

## Catalogue module boundary (technical lot T1)

Catalogue capabilities live together under `packages/backend/convex/catalogue/`:

- `read.ts` owns artist reads, Aggregate-backed lists/counts and public projections.
- `songs.ts` and `albums.ts` own their respective lifecycle mutations.
- `artwork.ts` owns upload intents, image claims, replacement and storage cleanup.
- `values.ts` owns shared validators, validation and projection helpers;
  `access.ts` centralizes catalogue ownership lookups.
- `tracks.ts` shares bounded album associations, ordering and metadata inheritance.
- `lyrics.ts` isolates bounded legacy lyric reconstruction from ordinary editing;
  `lyricsMigration.ts` owns its internal cursor-based backfill.
- `languageMigration.ts` owns the internal, bounded legacy-field cleanup used
  before removing primary-language fields from a populated deployment.
- `aggregates.ts` owns the existing named projections, triggers and backfill.

Public callers use generated `api.catalogue.read`, `.songs`, `.albums` and
`.artwork` paths. There is no global queries/mutations directory and no public
compatibility façade. Root `catalogue.ts` and `catalogueAggregates.ts` retain only
internal aliases for jobs scheduled before the path migration. New schedules,
crons and migration scripts target the nested modules. Remove these aliases only
after checking every target deployment for pending old-path scheduled jobs;
upload expiry alone is not enough if an old migration is still queued.

Authorization remains in the server function wrappers and ownership helpers.
No schema, public data shape, image-claim registry or named Aggregate component
changes as part of the file movement.

The separately authorized T1 follow-up removes song/album `primaryLanguage` and
track `inheritPrimaryLanguage` from inputs, projections and the schema. Deploy
the optional-field preparatory revision, clean all three tables and verify a
zero-removal traversal before deploying the tightened schema; see
[development.md](development.md). Other inherited metadata and Aggregate keys
remain unchanged. Authored Convex diagnostics and transactional email text use
English. Stable error codes, not server prose, select localized client messages.
Historical lyric headings remain source content and are not translated.

## Image preparation decisions (technical lot T1)

Before requesting an upload intent, both profile and catalogue uploads use one
web-only `prepareImageForUpload` helper and pinned
`browser-image-compression@2.0.2`. Preserve aspect ratio and use these targets:

| Kind | Longest side | Target size | Input/server size cap |
| --- | --- | --- | --- |
| Avatar | 512 px | 250 KiB | 5 MiB |
| Banner | 1920 px | 750 KiB | 10 MiB |
| Song/album artwork | 1600 px | 750 KiB | 10 MiB |

Byte targets guide compression, not server trust decisions. Request WebP at
initial quality 0.85 without retaining EXIF; preserve the actual encoder MIME
and extension when a browser falls back to PNG/JPEG. The codec is loaded lazily,
and the worker library is a bundled, same-origin asset rather than a CDN import.
The library can fall back to the main thread when workers are unavailable.
Empty, unsupported, oversized or undecodable input fails before an intent is
created. Encoding failures do not silently upload the original. Pending states
cover preparation and upload, with localized errors in French and English.

Store only the optimized file. Do not retain originals or create derivatives.
Server MIME/size validation, short-lived intents, ownership checks, replacement
and orphan cleanup remain mandatory even when a client bypasses compression.

Artwork selection is available on new and existing song/album forms. New entries
keep the selected file and its preview local until a draft is saved; only then
can the upload intent bind to that owned resource. Remember the saved draft id
before uploading, so a failed image can be retried without duplicate creation.
Keep the form values and explain partial success instead of navigating away.
Local preview URLs are revoked on replacement or unmount. Choosing custom song
artwork disables album-artwork inheritance for that save.

Artist-only preview pages expose a labelled pencil over the cover (or empty
placeholder), reusing the same upload pipeline for immediate replacement. The
public read-only song/album views have no artwork-edit controls. Compression is
an implementation detail: show format/size constraints once, not optimization
explanations or duplicate helper text. The navbar remains unchanged.
Editor thumbnails use fixed 96 px/160 px squares with a shrinkable input column,
never a full-width square at a narrow breakpoint.

## Catalogue aggregate decisions

1. `@convex-dev/aggregate@0.3.4` owns the artist catalogue projections used for
   counts, status filters, stable pagination, and album-track ordering. Songs
   and albums each have an owner projection and an owner/status projection;
   album tracks have a per-album position projection.
2. Every artist catalogue mutation runs through one trigger-wrapped Convex
   database context, so source-table changes and Aggregate maintenance commit
   transactionally. The projections use idempotent triggers to remain safe
   while historical rows are backfilled.
3. Historical catalogue rows are indexed by the bounded, cursor-driven
   `internal.catalogue.aggregates.backfill` mutation. It advances through songs,
   albums, and album tracks in scheduled batches without unbounded collection.
4. Artist Studio publication is an ownership-authorized action and no longer
   records a per-item rights confirmation. Community Fan publication uses a
   separate role-authorized domain, not the artist mutation seam or an
   administrator approval queue.

Operational setup and the evidence boundary are documented in
[authentication.md](authentication.md).

## External prerequisites not yet available

- Domain and hosting configuration.
- EAS project and Android signing configuration.

The Convex development project, Google OAuth credentials, and Resend credentials
are configured on the Europe-region development deployment. Their values and
local selection files remain ignored; public links and remaining end-to-end
checks are recorded in [authentication.md](authentication.md).

Absence of these values must be reported as an unverified integration, never
hidden by a fake success state.
