import { Disc3, FileMusic, MonitorPlay } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"

import {
  parseLyrics,
  type MessageKey,
  type SupportedLocale,
} from "@lyrx/shared"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"

import { useLocale } from "@/app/locale-provider"
import type {
  ListeningProvider,
  SongGenre,
} from "@/features/catalogue/lib/catalogue-form"
import {
  type ListeningPlayerRequest,
  SongListeningLinks,
} from "./song-listening-links"
import { SongMetadata } from "./song-metadata"
import { SongSectionNavigation } from "./song-section-navigation"
import { collectPlayableListeningLinks } from "./song-display"

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
    listeningLinks: Array<{ provider: ListeningProvider; url: string }>
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
  const { locale, t } = useLocale()
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [playerRequest, setPlayerRequest] = useState<ListeningPlayerRequest>()
  const sections = useMemo(
    () => parseLyrics(detail.lyricsText).sections,
    [detail.lyricsText]
  )
  const sectionNavigation = sections.map((section, index) => ({
    id: `lyrics-section-${index}`,
    label: section.heading || t("studio.lyrics"),
  }))
  const playableProviders = new Set(
    collectPlayableListeningLinks(detail.song.listeningLinks).map(
      (link) => link.embed.kind
    )
  )
  const metadata = [
    genreLabel(detail.song, t),
    languageLabel(detail.song.primaryLanguage, locale),
    shortDate(detail.song.releaseDate, locale),
  ].filter((value): value is string => Boolean(value))

  const launchPlayer = (provider: "spotify" | "youtube") => {
    document
      .getElementById("song-listening")
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
    setPlayerRequest({ provider, requestId: Date.now() })
  }

  return (
    <article className="flex flex-col gap-7">
      {actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {actions}
        </div>
      ) : null}
      <header className="flex gap-4 sm:gap-6">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted text-muted-foreground lg:size-[8.25rem]">
          {detail.artworkUrl ? (
            <img
              src={detail.artworkUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <FileMusic className="size-8 lg:size-10" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-medium tracking-[0.16em] text-primary uppercase">
            {detail.song.primaryArtist}
            {detail.song.guestArtists.length > 0 ? (
              <span className="ml-2 text-muted-foreground normal-case">
                feat. {detail.song.guestArtists.join(", ")}
              </span>
            ) : null}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {detail.song.title}
          </h1>
          {metadata.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {metadata.map((value) => (
                <Badge key={value} variant="secondary" className="font-normal">
                  {value}
                </Badge>
              ))}
            </div>
          ) : null}
          {detail.song.description ? (
            <div className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              <p className={descriptionExpanded ? undefined : "line-clamp-2"}>
                {detail.song.description}
              </p>
              <Button
                type="button"
                variant="link"
                className="mt-1 h-auto min-h-11 p-0"
                aria-expanded={descriptionExpanded}
                onClick={() => setDescriptionExpanded((expanded) => !expanded)}
              >
                {t(descriptionExpanded ? "studio.showLess" : "studio.showMore")}
              </Button>
            </div>
          ) : null}
        </div>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {playableProviders.has("youtube") ? (
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="size-12 rounded-full"
              aria-label={t("studio.listeningStart", { provider: "YouTube" })}
              onClick={() => launchPlayer("youtube")}
            >
              <MonitorPlay data-icon="inline-start" />
            </Button>
          ) : null}
          {playableProviders.has("spotify") ? (
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="size-12 rounded-full"
              aria-label={t("studio.listeningStart", { provider: "Spotify" })}
              onClick={() => launchPlayer("spotify")}
            >
              <Disc3 data-icon="inline-start" />
            </Button>
          ) : null}
        </div>
      </header>

      <div className="hidden lg:block">
        <SongSectionNavigation sections={sectionNavigation} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,41.25rem)_18.75rem] lg:justify-between lg:gap-12">
        <main className="order-2 min-w-0 lg:order-1">
          <div className="lg:hidden">
            <SongSectionNavigation sections={sectionNavigation} />
          </div>
          {detail.song.context ? (
            <blockquote className="mt-7 max-w-[41.25rem] text-base leading-7 text-muted-foreground italic">
              {detail.song.context}
            </blockquote>
          ) : null}
          <section className="mt-10 max-w-[41.25rem]">
            {sections.map((section, index) => (
              <div
                key={`${section.heading ?? "unheaded"}-${index}`}
                id={`lyrics-section-${index}`}
                className="scroll-mt-28 not-last:mb-12"
              >
                {section.heading ? (
                  <h2 className="mb-4 font-mono text-[0.6875rem] font-medium tracking-[0.2em] text-primary uppercase">
                    {section.heading}
                  </h2>
                ) : null}
                <div className="text-[1.1875rem] leading-[1.75] whitespace-pre-wrap lg:text-xl">
                  {section.lines.join("\n")}
                </div>
              </div>
            ))}
          </section>
        </main>
        <aside className="order-1 flex min-w-0 flex-col gap-5 lg:sticky lg:top-[4.5rem] lg:order-2 lg:self-start">
          <SongListeningLinks
            artworkUrl={detail.artworkUrl}
            links={detail.song.listeningLinks}
            playerRequest={playerRequest}
          />
          <SongMetadata song={detail.song} albumTitle={detail.album?.title} />
        </aside>
      </div>
    </article>
  )
}

const genreMessageKeys: Record<Exclude<SongGenre, "other">, MessageKey> = {
  electronic: "studio.genreElectronic",
  folk: "studio.genreFolk",
  gospel: "studio.genreGospel",
  "hip-hop": "studio.genreHipHop",
  jazz: "studio.genreJazz",
  pop: "studio.genrePop",
  reggae: "studio.genreReggae",
  rnb: "studio.genreRnb",
  rock: "studio.genreRock",
}

function genreLabel(
  song: ReadOnlySong["song"],
  t: (key: MessageKey) => string
) {
  if (!song.genre) return undefined
  if (song.genre === "other") return song.otherGenre
  return t(genreMessageKeys[song.genre])
}

function languageLabel(language: string, locale: SupportedLocale) {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(language)
  } catch {
    return language
  }
}

function shortDate(date: number | undefined, locale: SupportedLocale) {
  if (date === undefined) return undefined
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}
