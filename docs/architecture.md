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

## Web route and page composition (approved 31 October 2026)

Keep page composition in `apps/web/src/routes/`, using nested folders
that mirror the URL structure (for example, `routes/studio/songs/new.tsx`). A
route should make the page understandable during review: it owns route-specific
loading and the visible composition of the page. Compose meaningful domain
features from `features/`; do not turn every route into a thin wrapper around a
hidden full-page module. Extract substantial feature behavior into `features/`
when it earns a distinct module, rather than moving pages there by default. The
directory layout is illustrative and must follow actual routes in this
repository.

For Convex-backed pages, use the documented TanStack Start integration when
the route needs its data before rendering: the route loader awaits the
`convexQuery` through the shared `QueryClient`, and the rendered page reads that
same query with `useSuspenseQuery`. Keep loader dependencies and query arguments
consistent with the query consumed by the page so navigation preloads the
matching cache entry. Keep optional secondary reads non-blocking where the page
can render without them; do not add a loader mechanically to routes with no
pre-render data requirement. Router intent preloading remains enabled so route
loaders can start on link hover/touch before navigation.

For Convex reads without a route loader, use `useQuery` / `usePaginatedQuery`
from `convex-helpers/react/cache` when retaining the subscription across return
visits within the document session is useful. Keep mutations in `convex/react`.
Do not automatically migrate variable-term search: it retains the standard hook
to avoid holding subscriptions for each typed term. Route-required data stays
on loader + `convexQuery` + `useSuspenseQuery`; the caches are distinct, even
though both use the same Convex client.

`BackendProvider` mounts Helpers below Better Auth with a five-minute idle
expiration and at most 250 idle entries. Retention keeps server subscriptions
active and incurs bandwidth; it is neither persistence nor first-visit preload.
Pagination retains subscriptions, not the hook's accumulated page state: a
remount starts at page one and subsequent Load more can reuse retained pages.
Helpers keys contain function/arguments, not account identity. Current sign-out,
password sign-in and account-deletion completion use document navigation,
constructing fresh Convex and Query clients; preserve this boundary. Do not
introduce in-place account switching without reviewing both caches and ensuring
old private results cannot render. Server authorization remains mandatory.

Make route preloading and query-cache state inspectable with development-only
TanStack Router and React Query Devtools. Keep them out of production output.
Apply this architecture across the authorized refactor directly; a separate
pilot/POC route is not a prerequisite. The regular review and verification
requirements in `AGENTS.md` and `development.md` still apply. This standalone
refactor feature is approved before Lot 10; finish it before starting that lot.

## Refactor implementation decisions (31 October 2026)

Public home, lists and details compose their page inside the real routes.
Shared catalogue filters/pagination, profile identity/banner, optional artist
catalogue and community report lifecycle remain distinct features. Account
redirection and liked-page access/header belong to routes. Editor controllers,
private incremental lists and moderation remain functional modules.

List loaders and Suspense readers share `catalogue-queries.ts` factories and
validated URL dependencies. Public loaders use the current Convex recommendation
for Query 5.104.5: `queryClient.query` with `convexQuery` and static stale time.
Optional and protected reads are not mechanically moved to server loaders.
The root owns the missing-configuration notice; `BackendRequired` is removed.
Its non-reloading loader seeds the initial auth token once, avoiding repeated
server-function waits during public preloads/clicks. The provider still handles
live auth and Convex functions enforce all permissions.

Intent preloading stays enabled. Cold pending feedback starts at 150 ms, with
no forced minimum duration. This changes feedback, not network latency. Lazy
devtools imports are guarded by `import.meta.env.DEV` and absent from production
artifacts. Only `Route` is exported from route files to preserve code splitting;
Vitest alone disables Start's splitting transform for route-component tests.

T1 already separated the Convex catalogue's reads, lifecycle writes, artwork,
ownership, tracks, validators and Aggregate maintenance. Inspection found no
further backend reorganization justified here. No schema or backend function
changes, migration or deployment belong to this feature. The measured cold and
preloaded album-card paths and their limits are recorded in
[verification](pre-lot10-verification.md).

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

The approved lot 7 target replaces only the separate public Community listing
with unified Artist/Fan song discovery and origin badges. Preserve the community
write/moderation domain, private author tools, and existing detail links. A unified
public read projection must apply consistent ordering, pagination, counts, and
visibility across both origins; concatenating two independently paginated lists
is insufficient. Its maintenance must cover moderation, withdrawal, and account
deletion as well as publication. The implemented lot 7 interface now owns the
visual reference; subsequent search/slider decisions are recorded in
[the lot 8 direction](lot8-direction.md).

## Public discovery projection (lot 7)

`convex/discovery/` owns read-only discovery, not publication ownership.
`discoveryEntries` contains minimal source/owner, normalized title, first-publication
time, genre and recent score. The named `publicDiscovery` DirectAggregate indexes
one ordering across Artist and Fan songs plus album/artist scopes, sorts and
filters. Numbered queries request at most 24 positions; home selects six newest
and six popular songs, eight artists and eight albums. Card hydration resolves current
source data and storage URLs without returning raw lyrics, email or moderation data.
Lot 8 adds optional public-only `searchText` to this same projection and one
native text index: published metadata/lyrics share a global relevance cursor.
A versioned backfill gates search separately from existing discovery. Results
hydrate current canonical public sources and bound excerpts; index text never
leaves server queries. Eligibility jobs block search as well as discovery.
Search-text-only updates preserve unchanged Aggregate positions.
Album cards deliberately omit a track count instead of reading every track's
complete lyric document for every album on a list page.

Trigger-wrapped writes synchronize publication, edits, moderation, withdrawal,
profile availability and account eligibility. A durable owner job refreshes
eligibility and large album inheritance changes in batches of ten sources.
During initial backfill or pending owner jobs, public discovery returns
`ready:false` rather than exposing stale entries or misleading totals. Existing
public detail reads independently recheck eligibility and remain available when
unaffected. A one-minute recovery cron resumes stalled jobs. Reactive numbered
pages can shift after publication changes; they are not snapshots.

Popularity counts verified signed-in member views, excluding the author,
deduplicated by member/source/UTC day. Seven UTC days are retained; scheduled
expiry and the recovery cron materialize score changes without a query reading
the wall clock. Expiry/cascade batches handle at most 25 view rows. Anonymous
reading is unrestricted but uncounted, and telemetry failure never blocks the
reader. There are no playback/like counts or ranking inputs from later lots.

The shared textarea's optional heading buttons use supported native `insertText`
editing to preserve undo, selection and focus. When that API is unavailable,
the tools are hidden and ordinary free writing remains available. Chromium undo
is browser-verified; no cross-engine or physical mobile keyboard claim is made.

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

The lot 8 search contract, costs, migration and evidence are recorded in
[lot8-verification.md](lot8-verification.md).


## Song interaction boundary (lot 9)

`convex/interactions/` owns likes, flat comments and private comment reports for
both canonical song origins. Reads hydrate the current source and owner eligibility;
source IDs never confer write authority. Mutations use existing member/admin
wrappers, indexed idempotency keys and the Rate Limiter component. A simple
transactional per-source like counter serves public totals; it is separate from
the seven-day view-ranking projection. Private liked pages are indexed by member
and creation time, with current public source hydration.

Comment bodies are immutable until erased by their author or an admin decision.
Minimal tombstones preserve retry/report identity without storing erased text.
Source-deletion triggers create resumable 25-row cleanup jobs; account deletion's
final guard handles likes, authored text and anonymized foreign audit history.
No new image claims or production migration are needed. See
[lot9-verification.md](lot9-verification.md) for limits and evidence boundaries.
