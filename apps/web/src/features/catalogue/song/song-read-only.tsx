import { FileMusic } from "lucide-react"
import type { ReactNode } from "react"

import { parseLyrics } from "@lyrx/shared"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"

import { useLocale } from "@/app/locale-provider"
import type {
  ListeningProvider,
  SongGenre,
} from "@/features/catalogue/lib/catalogue-form"
import { SongListeningLinks } from "./song-listening-links"
import { SongMetadata } from "./song-metadata"

type ReadOnlySong = {
  album?: { title: string } | null
  artworkUrl: string | null
  lyricsText: string
  song: {
    composers: Array<string>
    context?: string
    description?: string
    genre?: SongGenre
    guestArtists: Array<string>
    label?: string
    listeningLinks: Array<{
      provider: ListeningProvider
      url: string
    }>
    otherGenre?: string
    primaryArtist: string
    primaryLanguage: string
    producers: Array<string>
    releaseDate?: number
    title: string
    writers: Array<string>
  }
}

export function SongReadOnly({
  actions,
  detail,
}: {
  actions?: ReactNode
  detail: ReadOnlySong
}) {
  const { t } = useLocale()
  const sections = parseLyrics(detail.lyricsText).sections

  return (
    <article className="flex flex-col gap-6">
      {actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {actions}
        </div>
      ) : null}
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
      <SongMetadata song={detail.song} albumTitle={detail.album?.title} />
      <SongListeningLinks links={detail.song.listeningLinks} />
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-4">
        {sections.map((section, index) => (
          <div
            key={`${section.heading ?? "unheaded"}-${index}`}
            className="flex flex-col gap-3"
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
