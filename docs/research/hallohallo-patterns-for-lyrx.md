# Hallohallo patterns to consider for Lyr'X

Status: research only, 24 October 2026. This note makes no product decision
and authorizes no application-code change.

## What was inspected

The local Hallohallo project groups Convex work by product domain. Its listing
domain separates reads, writes, image URL resolution, privacy, and translation:
`convex/listings/queries.ts`, `mutations.ts`, `imageUrls.ts`, `privacy.ts`, and
`translate.ts`. This is not a prescription to duplicate its file count. The
useful pattern is one domain module with small, coherent interfaces and hidden
implementation details.

Lyr'X currently has the analogous song/album/artwork/lyrics work concentrated
in `packages/backend/convex/catalogue.ts` (1,781 lines). Its aggregate triggers
already sit separately in `catalogueAggregates.ts`, and its
`artistMutation` wrapper already guarantees that authorised catalogue writes
maintain those projections transactionally. Both are valuable invariants to
preserve during any file movement.

Hallohallo also demonstrates three practices relevant to Lyr'X:

- Its authenticated and administrator function builders resolve the current
  user server-side; callers never provide their own user id. See
  `convex/functions.ts` and `convex/auth/auth.ts`.
- It uses `@convex-dev/aggregate` and bounded pagination. Lyr'X already uses
  the same aggregate component for artist catalogue projections, so this is
  an area to preserve and extend only when a concrete read path needs it.
- Before listing-image uploads, its form calls `browser-image-compression`
  client-side with `maxSizeMB: 0.5`, `maxWidthOrHeight: 1920`, and a Web Worker
  (`app/[locale]/(main)/listing/_component/forms/listingForm.tsx`). This reduces
  bytes sent; it is not a server-side trust or validation mechanism.

## Recommended Lyr'X direction

Refactor by catalogue capability, not by an artificial global `queries/` versus
`mutations/` split. A candidate module map is:

```text
convex/catalogue/
  read.ts              artist-studio and public read projections
  songs.ts             create/update/publish/delete a song
  albums.ts            create/update/tracks/publish/delete an album
  artwork.ts           upload intent, ownership registration, replacement
  lyricsMigration.ts   legacy lyricsText backfill only
  values.ts            shared validators and public projection helpers
  access.ts            catalogue ownership/visibility helpers, if reuse proves real
  index.ts              only if a deliberately small compatibility interface is useful
```

The actual names may differ. The interfaces should remain small:

- all artist writes cross the existing trigger-wrapped `artistMutation` seam;
- public functions return a deliberately public projection rather than database
  documents;
- image ownership and cleanup rules stay in one module;
- legacy lyric reconstruction/backfill stays out of ordinary song editing;
- the generated Convex function paths and every web caller are migrated
  atomically, or a temporary compatibility interface is retained deliberately.

Do not create files merely because a function is short. A new module earns its
place when deleting it would force validation, authorisation, projections, or
storage rules to be repeated by several callers.

## Image upload decision to make before implementation

For Lyr'X avatar, banner, and artwork images, client-side compression is a good
candidate because it lowers mobile data use and storage cost. It should be an
optional client pre-processing step for supported raster images, followed by
the current server-authorised upload intent. The server must continue to impose
its own accepted MIME types, size limits, ownership checks, and cleanup rules:
client compression is helpful but untrusted.

Decide exact per-kind limits before adding the library (for example, a smaller
avatar cap and a larger artwork cap). Store the single optimized upload unless a
future product requirement genuinely needs an original file or multiple image
derivatives. Convex storage alone does not create responsive image variants.


## Suggested implementation order, after approval

1. Record the authority decision for the image constraints.
2. Add tests around the present catalogue function interfaces and authorisation
   rules, so moving files cannot silently change them.
3. Extract pure validators/projections and storage helpers first.
4. Move one vertical capability at a time (song reads/writes, albums, artwork,
   then migration) while keeping aggregate writes and existing UI callers
   working.
5. Only then change function paths/callers and remove an intentionally temporary
   compatibility interface.

## Sources

- Hallohallo local source: `convex/listings/*`, `convex/functions.ts`,
  `convex/auth/auth.ts`, and its listing form cited above.
- Lyr'X local source: `packages/backend/convex/catalogue.ts`,
  `catalogueAggregates.ts`, `lib/functions.ts`, and `lib/authz.ts`.
