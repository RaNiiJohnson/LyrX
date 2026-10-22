# Web structure and Convex guidance for the next implementation lot

**Status: planning reference only — no application code was changed while this
note was written.** It records the product and architecture decisions confirmed
on 2026-10-22 for the lot after the completed artist-catalogue work.

## Settled product scope

- Lyr'X has no lyric-line explanation, explanation request, explanation vote,
  or explanation moderation capability. It is not deferred work.
- Lyr'X has no dedication or personal-message capability on a sharing card. It
  is not deferred work.
- Lyrics use one raw multiline source text. The future private notebook must
  retain a source revision or content fingerprint, textual range, and snapshot;
  it must not silently turn an old saved excerpt into a different passage after
  an edit.

`docs/product.md`, `docs/specification.md`, and `docs/roadmap.md` are the
authoritative product records for these decisions. The former explanation lot
was removed. The next work is now roadmap lot 5 and requires explicit user
approval before implementation.

There are still historical implementation strings mentioning explanations (for
example the artist onboarding copy). They are not evidence of an implemented
feature; remove or rewrite them as part of lot 5, together with any stale
types, tests, and documentation discovered during the scoped refactor.

## Web ownership and folder boundaries

The current `apps/web/src/components/` combines global infrastructure, whole
pages, and page-specific UI. The target is deliberately clearer:

```text
apps/web/src/
  routes/       # each route owns its screen, route params, loader/deps,
                 # and route-local pending/error/not-found boundaries
  features/     # domain UI, form state, parsers and view models
                 # e.g. catalogue/song-editor and catalogue/lyrics
  app/          # application-wide provider and shell composition
  components/   # only genuinely reusable UI if one remains here
packages/ui/    # repository-owned shadcn primitives and their shared styling
```

Do not merely move a 400–900 line screen from `components/` into a route. Split
the current catalogue editors by responsibility (page composition, form,
artwork upload, lyrics, preview) under their catalogue feature. A route may
import a feature screen, but it remains responsible for its URL state, its
loader, and its route boundary. A feature module must not become another
unclassified `components/` directory.

The end state should remove page components from `apps/web/src/components/`.
Existing cross-cutting items such as the shell and providers should move to
`app/`; the shadcn source components already belong in `packages/ui`.

## Convex with TanStack Start

Use the official Convex React Query integration intentionally, not as a
mechanical replacement of every `useQuery` call.

- `useSuspenseQuery(convexQuery(...))` is the simple SSR path: it fetches during
  the server render, and the client resumes the live Convex subscription without
  a loading flash.
- A route loader is an optional earlier prefetch. For data indispensable to the
  screen, await the same `convexQuery` in the loader with `staleTime: "static"`,
  then use that same query through `useSuspenseQuery` in the route component.
  With `defaultPreload: "intent"`, this can prefetch when the user hovers a
  link.
- For nonessential data, start the loader query without awaiting it, safely
  consume a possible prefetch error, and render its pending/error state with
  regular React Query `useQuery`.
- Do not add protected data to a server loader until the Better Auth token path
  has been proven for this integration. The current root obtains a token for its
  Convex provider, while the current router does not yet configure the Query
  Client / Convex Query Client / SSR Query integration required by the official
  pattern. Authentication, SSR, client navigation, and signed-out behavior are
  all mandatory regression cases.

The official guide requires `@convex-dev/react-query`, `@tanstack/react-query`,
and `@tanstack/react-router-ssr-query`; its loader examples require React Query
5.102.0 or newer. Audit compatible versions and the Better Auth integration
before changing dependencies. TanStack Start is still documented as Release
Candidate. Sources: [Convex + TanStack Start](https://docs.convex.dev/client/tanstack/tanstack-start/),
[Convex TanStack Start quickstart](https://docs.convex.dev/quickstart/tanstack-start).

## Convex conventions learned from Hallohallo

Hallohallo is a useful local reference, not a template to copy wholesale. Keep
the practices that fit Lyr'X's data model:

- Every list is bounded and uses an index plus Convex cursor pagination. Lyr'X
  already does this for the artist Studio's `listMySongs` and `listMyAlbums`;
  retain it and apply it to every later public list and search result.
- Public queries return a deliberate public projection, never an internal
  document merely because it is convenient. This is especially important before
  public discovery/search is built.
- Centralize server authorization in custom query/mutation helpers. Lyr'X
  already has the right foundation in `packages/backend/convex/lib/functions.ts`;
  preserve that approach rather than duplicating role tests in the UI.
- Add `@convex-dev/aggregate` only when a real later requirement needs an
  efficient count or ordered traversal at catalogue scale (for example, public
  popularity). An aggregate is a maintained index: registration, atomic updates
  on every relevant mutation, a backfill/migration plan, mocks, and coherence
  tests are all required. Do not introduce aggregates merely as a style choice.
- Preserve the existing indexed limits and pagination; never replace them with
  unbounded `.collect()` calls in user-facing catalogue queries.

## One-textarea lyric authoring

The song editor has one and only one normal lyrics field: a multiline
`textarea`. It replaces the current line-by-line inputs and their move/delete
controls. Pasting and typing use the same field; this is a Genius-style text
authoring experience:

```text
[Couplet 1]
Ligne 1
Ligne 2

[Refrain]
Ligne 1
Ligne 2
```

The raw text is the canonical value saved with the song and must round-trip
unchanged. A parser may derive sections and display lines for the public reader,
search, excerpts, or future sharing, but it must never turn the normal editing
experience back into per-line fields. The read-only song page has no clickable
lines at this stage.

The parser recognizes headings on a line by themselves. It maps `Couplet` and
`Verse` to `verse`, `Refrain` and `Chorus` to `chorus`, `Pont` and `Bridge` to
`bridge`, and `Intro`/`Outro` to their matching kinds. A heading not in this
small known list becomes a custom section with its original label; do not guess
that a label such as `[Pré-refrain]` is a chorus. Blank lines remain in the raw
source and may be used as visual separators in the reader.

The UI may show a non-editable parsing preview or a validation message before
save; the user corrects the same textarea. Parser coverage must include French
and English recognised headings, unknown headings, text before a heading,
empty/consecutive headings, CRLF input, blank lines, raw-text round trips, and
the configured server text limits.

## Future sharing-card study (not part of lot 5)

The existing later sharing-card lot will be studied before implementation. The
direction under consideration is Genius-style sharing: select one to four lyric
lines from a public song, then produce a square or vertical-story image with
the artwork as background, the excerpt centred, and visible Lyr'X, song-title,
and artist attribution. Do not implement it now or introduce clickable lyric
lines prematurely; its accessible selection interaction, rendering limits, and
source-withdrawal behavior need a dedicated decision first.
