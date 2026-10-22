import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { ArrowLeft, Disc3, FileMusic } from "lucide-react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { parseLyrics } from "@lyrx/shared"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { Skeleton } from "@lyrx/ui/components/skeleton"

import { useLocale } from "@/app/locale-provider"

export function SongPreview({ songId }: { songId: Id<"songs"> }) {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()
  if (current === undefined) return <PreviewSkeleton />
  if (current.state !== "ready" || current.member.role !== "artist") {
    return (
      <Alert>
        <AlertTitle>{t("studio.notArtistTitle")}</AlertTitle>
        <AlertDescription>{t("studio.notArtistDescription")}</AlertDescription>
      </Alert>
    )
  }
  return <ReadySongPreview songId={songId} />
}

function ReadySongPreview({ songId }: { songId: Id<"songs"> }) {
  const detail = useQuery(api.catalogue.getMySong, { songId })
  const { t } = useLocale()
  if (detail === undefined) return <PreviewSkeleton />
  const sections = parseLyrics(detail.lyricsText).sections

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/studio/songs/$songId" params={{ songId }}>
            <ArrowLeft /> {t("catalogue.edit")}
          </Link>
        </Button>
        <Badge variant="outline">{t("catalogue.preview")}</Badge>
      </div>
      <header className="grid overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10 md:grid-cols-[18rem_1fr]">
        <div className="aspect-square bg-muted md:aspect-auto">
          {detail.artworkUrl ? (
            <img
              src={detail.artworkUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full min-h-64 place-items-center text-muted-foreground">
              <FileMusic className="size-12" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-end gap-3 p-6 sm:p-8">
          <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">
            {detail.song.primaryArtist}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {detail.song.title}
          </h1>
          {detail.song.description ? (
            <p className="max-w-2xl text-muted-foreground">
              {detail.song.description}
            </p>
          ) : null}
        </div>
      </header>
      {detail.song.context ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("studio.context")}</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-muted-foreground">
            {detail.song.context}
          </CardContent>
        </Card>
      ) : null}
      <section className="mx-auto w-full max-w-3xl space-y-8 py-4">
        {sections.map((section, index) => (
          <div
            key={`${section.heading ?? "unheaded"}-${index}`}
            className="space-y-3"
          >
            {section.heading ? (
              <h2 className="font-mono text-xs font-medium tracking-[0.2em] text-primary uppercase">
                {section.heading}
              </h2>
            ) : null}
            <div className="text-lg leading-relaxed whitespace-pre-wrap">
              {section.lines.join("\n")}
            </div>
          </div>
        ))}
      </section>
    </article>
  )
}

export function AlbumPreview({ albumId }: { albumId: Id<"albums"> }) {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()
  if (current === undefined) return <PreviewSkeleton />
  if (current.state !== "ready" || current.member.role !== "artist") {
    return (
      <Alert>
        <AlertTitle>{t("studio.notArtistTitle")}</AlertTitle>
        <AlertDescription>{t("studio.notArtistDescription")}</AlertDescription>
      </Alert>
    )
  }
  return <ReadyAlbumPreview albumId={albumId} />
}

function ReadyAlbumPreview({ albumId }: { albumId: Id<"albums"> }) {
  const detail = useQuery(api.catalogue.getMyAlbum, { albumId })
  const { t } = useLocale()
  if (detail === undefined) return <PreviewSkeleton />

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/studio/albums/$albumId" params={{ albumId }}>
            <ArrowLeft /> {t("catalogue.edit")}
          </Link>
        </Button>
        <Badge variant="outline">{t("catalogue.preview")}</Badge>
      </div>
      <header className="grid overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10 md:grid-cols-[18rem_1fr]">
        <div className="aspect-square bg-muted md:aspect-auto">
          {detail.artworkUrl ? (
            <img
              src={detail.artworkUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full min-h-64 place-items-center text-muted-foreground">
              <Disc3 className="size-12" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-end gap-3 p-6 sm:p-8">
          <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">
            {t("studio.albums")}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {detail.album.title}
          </h1>
          {detail.album.description ? (
            <p className="max-w-2xl text-muted-foreground">
              {detail.album.description}
            </p>
          ) : null}
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{t("studio.albumTracks")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {detail.tracks.map(({ track, song }) => (
            <div
              key={track._id}
              className="flex items-center gap-4 rounded-xl border p-4"
            >
              <span className="font-mono text-sm text-muted-foreground">
                {track.position + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{song.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {song.primaryArtist}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </article>
  )
}

function PreviewSkeleton() {
  const { t } = useLocale()
  return (
    <div aria-label={t("common.loadingCatalogue")} className="space-y-5">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-80 w-full rounded-3xl" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
