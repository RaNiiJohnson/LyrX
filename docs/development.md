# Development guide

## Prerequisites

- Node.js 22
- pnpm 11 through Corepack or a compatible global installation
- Git

A hosted account is not required for the automated checks. Trying live account
flows requires a Convex development deployment and provider configuration as
described in [authentication.md](authentication.md).

## Install and run

```bash
pnpm install
pnpm dev
```

The root development command starts both the web workspace and the backend
Convex watcher in parallel. The backend watcher selects the configured Convex
development deployment, prepares the functions, and keeps deploying changes as
you edit them. You should therefore see `Preparing Convex functions...` and a
`Convex functions ready!` message in the same terminal when running:

```bash
pnpm dev
```

If you only need to run Convex independently (for example, while diagnosing a
startup issue), use:

```bash
pnpm --filter @lyrx/backend dev
```

Without the three public `VITE_` values, the web app deliberately renders a
configuration notice and does not simulate an auth backend.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

`pnpm check` is the handoff gate and runs the non-destructive automated checks.
For interface lots, supplement it with browser checks at desktop and mobile
widths. Backend and mobile lots add deployment- or device-specific evidence.

Backend-specific commands:

```bash
pnpm --filter @lyrx/backend auth:schema
pnpm --filter @lyrx/backend convex:codegen
```

The first command regenerates the repository-owned Better Auth schema. The
second requires a configured Convex deployment and replaces the documented
bootstrap generated types.

## GitHub Actions

[CI](../.github/workflows/ci.yml) runs for pull requests targeting `main` and
pushes to `main`. It can also be started manually from the Actions tab once the
workflow is present on the default branch.

The `Check project` job uses Node.js 22, installs the pnpm version declared in
the root `packageManager` field, restores the pnpm dependency cache, installs
with `--frozen-lockfile`, and runs the same `pnpm check` handoff gate as local
development. A newer run cancels an older run for the same PR or branch.

No deployment or account secret is required. CI uses the committed Convex
generated types and isolated backend tests; it does not regenerate the
authentication schema, push Convex functions, run migrations, or publish the
site. Those live checks remain explicit development/release steps. Actions
have read-only repository permissions and are pinned to commit SHAs.

## Legacy lyrics migration

Lot 5 keeps `songs.lyricsText` optional while deployments may still contain the
lot 4 `songSections` and `lyricLines` rows. After the lot 5 Convex functions are
pushed to the intended deployment, start the bounded backfill from the
repository root:

```bash
pnpm --filter @lyrx/backend migrate:lyrics
```

The command invokes the internal
`internal.catalogue.lyricsMigration.backfillSongLyricsText` mutation
with a null cursor. It processes one song per transaction and schedules the next
cursor until the table is exhausted. Its result reports whether the first row
was migrated and whether a continuation was scheduled. Running it again is
safe: songs that already contain `lyricsText` are skipped. The legacy tables are
retained during this compatibility phase; tighten the schema and remove them
only in a later, separately verified migration after every target deployment
has been checked.

Use `--prod` only as an explicit manual addition to the underlying Convex
command after the development deployment has been migrated and verified. The
repository command intentionally targets the selected development deployment.

## Catalogue Aggregate backfill

After functions containing the Aggregate components and trigger-wrapped artist
mutations are deployed, index existing songs, albums, and album tracks with:

```bash
pnpm --filter @lyrx/backend migrate:catalogue-aggregates
```

The internal migration processes bounded pages and schedules its continuation
through the three source tables. It uses `insertIfDoesNotExist`, so rerunning it
is safe. Deploy the trigger-wrapped mutations before starting the backfill so
concurrent catalogue writes remain synchronized. The repository command targets
the selected development deployment unless `--prod` is deliberately supplied
to the underlying Convex command.

## Image preparation verification

`apps/web/src/lib/image-upload.ts` is the only client image preparation policy
for avatar, banner and catalogue artwork. Targets and fallback behavior are
documented in [architecture.md](architecture.md). Its tests cover each policy,
bundled worker URL, actual encoder MIME/extension, invalid inputs and failures.
The existing server image validators and ownership tests remain independent.

For live development checks, use a dedicated unpublished test song, not an
existing profile image. Upload a synthetic JPEG/PNG, check the rendered image's
natural dimensions, and inspect `_storage` with
`pnpm --filter @lyrx/backend exec convex data _storage --limit 1 --format json`.
Confirm that a corrupt image produces a localized error and no new upload
intent. Do not publish a test draft, overwrite the member's avatar/banner, or
run a production deployment solely to manufacture evidence.

## Removing the legacy primary language

This removal was explicitly approved by the user on 24 October 2026. A target
with old rows must first deploy the preparatory T1 revision that keeps the
three legacy schema fields optional but no longer writes them. Do not deploy
the final tightened schema over uncleared rows.

Invoke the internal maintenance mutation for `songs`, `albums`, then
`albumTracks` (25 documents maximum per transaction):

```bash
pnpm --filter @lyrx/backend exec convex run catalogue/languageMigration:removePrimaryLanguage '{"table":"songs","cursor":null}'
```

For each table, pass the returned `continueCursor` as `cursor` until `isDone`
is true. Repeat the full traversal and verify that `removed` is zero on every
page before deploying the final schema. The migration only deletes
`primaryLanguage` from songs/albums and `inheritPrimaryLanguage` from tracks;
it does not delete documents, lyrics, artwork, track positions or Aggregate
projection keys. It is internal, bounded and safe to rerun. Do not add `--prod`
without a separately authorized production migration.

## Environment policy

Copy a package's `.env.example` only when that package documents the values it
uses. Keep real secrets in ignored local files or provider-managed environment
variables. Never prefix server-only secrets with a client-exposed environment
namespace.

## Delivery workflow

Work from one branch per roadmap lot. Update [progress.md](progress.md) with the
checks actually run, known issues, and next mission. Prepare a local commit and a
PR proposal, but do not push, open a PR, merge, deploy, or publish without the
user's explicit authorization for that action.
