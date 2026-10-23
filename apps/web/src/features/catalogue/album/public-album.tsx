import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Disc3, FileMusic } from "lucide-react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Card, CardContent } from "@lyrx/ui/components/card"

import { useLocale } from "@/app/locale-provider"

export function PublicAlbum({ albumId }: { albumId: Id<"albums"> }) {
  const { locale, t } = useLocale()
  const { data: detail } = useSuspenseQuery(
    convexQuery(api.catalogue.getPublishedAlbum, { albumId })
  )

  if (!detail) {
    return (
      <Alert>
        <AlertTitle>{t("notFound.title")}</AlertTitle>
        <AlertDescription>{t("notFound.description")}</AlertDescription>
      </Alert>
    )
  }

  const { album, artworkUrl, tracks } = detail
  const genre =
    album.genre === "other" ? album.otherGenre : album.genre?.replace("-", " ")

  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-4">
      <header className="grid gap-5 sm:grid-cols-[8.25rem_1fr] sm:items-end">
        <div className="flex aspect-square size-24 items-center justify-center overflow-hidden rounded-2xl bg-muted sm:size-[8.25rem]">
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <Disc3 className="size-10 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <p className="font-mono text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {t("studio.album")}
          </p>
          <h1 className="text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
            {album.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            {genre ? <Badge variant="secondary">{genre}</Badge> : null}
            {album.primaryLanguage ? (
              <Badge variant="secondary">{album.primaryLanguage}</Badge>
            ) : null}
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

      <section aria-labelledby="album-tracks-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="album-tracks-title" className="text-xl font-semibold">
            {t("studio.albumTracks")}
          </h2>
          <span className="text-sm text-muted-foreground">{tracks.length}</span>
        </div>
        <div className="space-y-2">
          {tracks.map(({ position, song }) => (
            <Card key={song._id}>
              <CardContent className="flex min-h-16 items-center gap-4 py-3">
                <span className="w-7 text-right font-mono text-sm text-muted-foreground">
                  {position + 1}
                </span>
                <FileMusic className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/songs/$songId"
                    params={{ songId: song._id }}
                    className="font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {song.title}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {song.primaryArtist}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {album.label || album.credits.length > 0 ? (
        <section className="space-y-3 border-t pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            {t("studio.detailsAndCredits")}
          </h2>
          {album.label ? (
            <p className="text-sm">
              <span className="text-muted-foreground">{t("studio.label")}: </span>
              {album.label}
            </p>
          ) : null}
          {album.credits.length > 0 ? (
            <p className="whitespace-pre-line text-sm">{album.credits.join("\n")}</p>
          ) : null}
        </section>
      ) : null}
    </article>
  )
}
