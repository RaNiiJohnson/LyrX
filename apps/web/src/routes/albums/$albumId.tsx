import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { BackButton } from "@/app/back-button"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { ChevronRight, Disc3 } from "lucide-react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Badge } from "@lyrx/ui/components/badge"

import { useLocale } from "@/app/locale-provider"
import { genreMessageKeys } from "@/features/discovery/catalogue-search"
import { useTrackCountLabel } from "@/features/discovery/discovery-cards"

export const Route = createFileRoute("/albums/$albumId")({
  ...appRouteBoundaries,
  loader: async ({ context, params }) => {
    if (!context.convexQueryClient) return
    const detail = await context.queryClient.query({
      ...convexQuery(api.catalogue.read.getPublishedAlbum, {
        albumId: params.albumId as Id<"albums">,
      }),
      staleTime: "static",
    })
    if (!detail) throw notFound()
  },
  component: PublicAlbumPage,
})

function PublicAlbumPage() {
  const { albumId: id } = Route.useParams()
  const albumId = id as Id<"albums">
  const { locale, t } = useLocale()
  const { data: detail } = useSuspenseQuery(
    convexQuery(api.catalogue.read.getPublishedAlbum, { albumId })
  )

  if (!detail) throw notFound()

  const trackCountLabel = useTrackCountLabel()
  const { album, artist, artworkUrl, tracks } = detail
  const genre =
    album.genre === "other"
      ? album.otherGenre
      : album.genre
        ? t(genreMessageKeys[album.genre])
        : undefined

  return (
    <PageShell width="wide">
      <article className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-4">
        <div>
          <BackButton fallback="/albums" />
        </div>
        <header className="grid gap-6 sm:grid-cols-[14rem_1fr] sm:items-end">
          <div className="flex aspect-square size-44 items-center justify-center overflow-hidden rounded-2xl bg-muted shadow-lg sm:size-56">
            {artworkUrl ? (
              <img src={artworkUrl} alt="" className="size-full object-cover" />
            ) : (
              <Disc3 className="size-14 text-muted-foreground" aria-hidden />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <p className="font-mono text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              {t("studio.album")}
            </p>
            <h1 className="text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
              {album.title}
            </h1>
            <p className="text-base text-muted-foreground">
              <Link
                to="/artists/$handle"
                params={{ handle: artist.handle }}
                className="font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {artist.displayName}
              </Link>
              {" · "}
              {trackCountLabel(tracks.length)}
            </p>
            <div className="flex flex-wrap gap-2">
              {genre ? <Badge variant="secondary">{genre}</Badge> : null}
              {album.releaseDate ? (
                <Badge variant="secondary">
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  }).format(album.releaseDate)}
                </Badge>
              ) : null}
            </div>
            {album.description ? (
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {album.description}
              </p>
            ) : null}
          </div>
        </header>

        <section
          aria-labelledby="album-tracks-title"
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="album-tracks-title" className="text-xl font-semibold">
              {t("studio.albumTracks")}
            </h2>
          </div>
          <ol className="flex flex-col border-t">
            {tracks.map(({ position, song }) => (
              <li key={song._id} className="border-b">
                <Link
                  to="/songs/$songId"
                  params={{ songId: song._id }}
                  className="group flex min-h-16 items-center gap-4 rounded-md px-1 py-3 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="w-7 shrink-0 text-right font-mono text-sm text-muted-foreground">
                    {position + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium group-hover:underline">
                      {song.title}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {song.primaryArtist}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {album.label || album.credits.length > 0 ? (
          <section className="flex flex-col gap-3 border-t pt-6">
            <h2 className="text-sm font-semibold tracking-wider uppercase">
              {t("studio.detailsAndCredits")}
            </h2>
            {album.label ? (
              <p className="text-sm">
                <span className="text-muted-foreground">
                  {t("studio.label")}:{" "}
                </span>
                {album.label}
              </p>
            ) : null}
            {album.credits.length > 0 ? (
              <p className="text-sm whitespace-pre-line">
                {album.credits.join("\n")}
              </p>
            ) : null}
          </section>
        ) : null}
      </article>
    </PageShell>
  )
}
