import { useEffect, useId, useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Music2, Pause, Play } from "lucide-react"
import { Button } from "@lyrx/ui/components/button"
import { Badge } from "@lyrx/ui/components/badge"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@lyrx/ui/components/carousel"
import { useLocale } from "@/app/locale-provider"
import {
  AlbumVinyl,
  useTrackCountLabel,
  type DiscoveryAlbum,
  type DiscoverySong,
} from "@/features/discovery/discovery-cards"
import { DiscoveryEmpty } from "@/features/discovery/discovery-states"

type ReleaseSong = DiscoverySong & { firstPublishedAt: number }
type ReleaseAlbum = DiscoveryAlbum & { firstPublishedAt: number }
type Release = {
  kind: "single" | "album"
  id: string
  title: string
  context: string
  artworkUrl: string | null
  href: string
  firstPublishedAt: number
  label: string
  cta: string
  excerpt?: string
  /** Album only: first titles and how many more public ones exist. */
  tracks?: Array<string>
  moreTracks?: number
}

const MAX_RELEASES = 6
const sameName = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()

/**
 * Newest releases, albums and singles together. A track of an album that is
 * itself a candidate is skipped: the album already represents it.
 */
export function pickReleases(
  songs: ReadonlyArray<ReleaseSong>,
  albums: ReadonlyArray<ReleaseAlbum>
) {
  const covered = (song: ReleaseSong) =>
    song.origin === "artist" &&
    Boolean(song.albumTitle) &&
    albums.some(
      (album) =>
        sameName(album.title, song.albumTitle ?? "") &&
        sameName(album.artistName, song.primaryArtist)
    )
  return {
    songs: songs.filter((song) => !covered(song)),
    albums: [...albums],
  }
}

// Embla's selected target may wait until pointer release. Follow actual geometry
// during dragging, including slides translated across the loop boundary.
function visibleRelease(api: NonNullable<CarouselApi>) {
  const viewport = api.rootNode().getBoundingClientRect()
  if (!viewport.width) return api.selectedScrollSnap()
  const center = viewport.left + viewport.width / 2
  let distance = Infinity
  let nearest = api.selectedScrollSnap()
  api.slideNodes().forEach((slide, position) => {
    const rect = slide.getBoundingClientRect()
    const next = Math.abs(rect.left + rect.width / 2 - center)
    if (next < distance) {
      distance = next
      nearest = position
    }
  })
  return nearest
}

/** Existing public releases only; rotation never starts media playback. */
export function ReleaseSlider({
  songs,
  albums,
}: {
  songs: Array<ReleaseSong>
  albums: Array<ReleaseAlbum>
}) {
  const { t } = useLocale()
  const id = useId()
  const [api, setApi] = useState<CarouselApi>()
  const [failedArtwork, setFailedArtwork] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  function artworkFailed(src: string | null) {
    if (!src) return
    setFailedArtwork((previous) =>
      previous.has(src) ? previous : new Set(previous).add(src)
    )
  }
  const [active, setActive] = useState(0)
  const [moving, setMoving] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [held, setHeld] = useState(false)
  const [focused, setFocused] = useState(false)
  const [cycle, setCycle] = useState(0)
  const [reduced, setReduced] = useState(true)
  const [hidden, setHidden] = useState(false)
  const trackCountLabel = useTrackCountLabel()
  const picked = pickReleases(songs, albums)
  const usable = (src: string | null) =>
    src && !failedArtwork.has(src) ? src : null
  const releases: Array<Release> = [
    ...picked.songs.map((song): Release => ({
      kind: "single",
      id: `song:${song.origin}:${song.id}`,
      title: song.title,
      context: song.primaryArtist,
      artworkUrl: usable(song.artworkUrl),
      href: song.href,
      firstPublishedAt: song.firstPublishedAt,
      label:
        song.origin === "community"
          ? t("discovery.sourceCommunity")
          : song.albumTitle
            ? t("releases.fromAlbum", { album: song.albumTitle })
            : t("releases.single"),
      cta: t("releases.openSong"),
      ...(song.lyricsExcerpt ? { excerpt: song.lyricsExcerpt } : {}),
    })),
    ...picked.albums.map((album): Release => ({
      kind: "album",
      id: `album:${album.id}`,
      title: album.title,
      context: album.artistName,
      artworkUrl: usable(album.artworkUrl),
      href: album.href,
      firstPublishedAt: album.firstPublishedAt,
      label: album.trackCount
        ? t("releases.albumMeta", {
            tracks: trackCountLabel(album.trackCount),
            year: new Date(album.firstPublishedAt).getUTCFullYear(),
          })
        : t("releases.album", {
            year: new Date(album.firstPublishedAt).getUTCFullYear(),
          }),
      cta: t("releases.openAlbum"),
      ...(album.tracks?.length
        ? {
            tracks: album.tracks.map((track) => track.title),
            moreTracks: Math.max(
              0,
              (album.trackCount ?? 0) - album.tracks.length
            ),
          }
        : {}),
    })),
  ]
    .sort(
      (a, b) =>
        b.firstPublishedAt - a.firstPublishedAt || a.id.localeCompare(b.id)
    )
    .slice(0, MAX_RELEASES)
  const count = releases.length
  const index = Math.min(active, Math.max(0, count - 1))
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(preference.matches)
    const visibility = () => setHidden(document.hidden)
    update()
    visibility()
    preference.addEventListener("change", update)
    document.addEventListener("visibilitychange", visibility)
    const release = () => setHeld(false)
    window.addEventListener("pointerup", release)
    window.addEventListener("pointercancel", release)
    window.addEventListener("blur", release)
    return () => {
      window.removeEventListener("pointerup", release)
      window.removeEventListener("pointercancel", release)
      window.removeEventListener("blur", release)
      preference.removeEventListener("change", update)
      document.removeEventListener("visibilitychange", visibility)
    }
  }, [])
  useEffect(() => {
    if (!api) return
    const update = () => setActive(visibleRelease(api))
    const scroll = () => {
      setMoving(true)
      update()
    }
    const settle = () => {
      setMoving(false)
      update()
    }
    const down = () => {
      setFocused(false)
      setHeld(true)
    }
    const up = () => setHeld(false)
    update()
    api
      .on("select", update)
      .on("reInit", settle)
      .on("scroll", scroll)
      .on("settle", settle)
      .on("pointerDown", down)
      .on("pointerUp", up)
    return () => {
      api
        .off("select", update)
        .off("reInit", settle)
        .off("scroll", scroll)
        .off("settle", settle)
        .off("pointerDown", down)
        .off("pointerUp", up)
    }
  }, [api])
  const stopped =
    count < 2 ||
    !api ||
    paused ||
    hovered ||
    held ||
    focused ||
    moving ||
    hidden ||
    reduced
  useEffect(() => {
    if (stopped) return
    const timer = setTimeout(() => api.scrollNext(), 7000)
    return () => clearTimeout(timer)
  }, [api, index, stopped, cycle])
  function go(next: number) {
    setCycle((value) => value + 1)
    api?.scrollTo(next, reduced)
  }

  return (
    <section
      aria-labelledby={id}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setHovered(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") setHovered(false)
      }}
      onPointerDown={() => {
        setFocused(false)
        setHeld(true)
      }}
      onPointerUp={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      onFocusCapture={(event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.matches(":focus-visible") &&
          !event.target.closest("[data-rotation]")
        )
          setFocused(true)
      }}
      onBlurCapture={(event) => {
        if (!(
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        ))
          setFocused(false)
      }}
      className="relative isolate min-w-0 overflow-hidden bg-muted"
    >
      {count ? (
        <ReleaseBackdrop
          key={releases[index]?.artworkUrl ?? "missing"}
          src={releases[index]?.artworkUrl ?? null}
          onError={() => artworkFailed(releases[index]?.artworkUrl ?? null)}
        />
      ) : null}
      <h1 id={id} className="sr-only">
        {t("releases.title")}
      </h1>
      {!count ? (
        <div className="flex min-h-80 items-center justify-center p-6 sm:min-h-[34rem]">
          <DiscoveryEmpty />
        </div>
      ) : (
        <>
          <Carousel
            setApi={setApi}
            opts={{
              loop: count > 1,
              align: "start",
              duration: reduced ? 0 : 25,
            }}
            aria-labelledby={id}
            aria-roledescription={t("releases.carousel")}
            tabIndex={0}
            className="cursor-grab outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
          >
            <CarouselContent className="ml-0 items-stretch">
              {releases.map((release, position) => (
                <CarouselItem
                  key={release.id}
                  aria-label={`${position + 1} / ${count}`}
                  inert={position !== index}
                  className="flex pl-0"
                >
                  <article className="relative isolate flex min-h-[32rem] w-full items-center overflow-hidden px-5 pt-20 pb-20 text-hero-foreground sm:min-h-[38rem] sm:px-10 sm:pt-24 sm:pb-24 lg:min-h-[44rem] lg:px-16 lg:pt-40 lg:pb-36 xl:px-24">
                    <ReleaseArtwork
                      key={release.artworkUrl ?? "missing"}
                      src={release.artworkUrl}
                      onError={() => artworkFailed(release.artworkUrl)}
                      eager={position === 0}
                      title={release.title}
                      album={release.kind === "album"}
                    >
                      <div className="order-2 flex w-full min-w-0 flex-col items-center gap-4 text-center lg:order-1 lg:items-start lg:gap-5 lg:text-left">
                        <Badge
                          variant="secondary"
                          className="border-hero-foreground/10 bg-hero-foreground/15 text-hero-foreground"
                        >
                          {release.label}
                        </Badge>
                        <h2 className="font-serif text-4xl leading-tight break-words sm:text-5xl lg:text-7xl">
                          {release.title}
                        </h2>
                        <p className="text-lg break-words text-hero-foreground/90 lg:text-xl">
                          {release.context}
                        </p>
                        {release.excerpt ? (
                          <p className="hidden max-w-md font-serif text-lg whitespace-pre-line text-hero-foreground/80 italic sm:block lg:text-xl">
                            {release.excerpt}
                          </p>
                        ) : null}
                        {release.tracks ? (
                          <ol
                            aria-label={t("releases.tracksLabel")}
                            className="hidden max-w-md min-w-0 flex-col gap-1 text-left text-hero-foreground/85 sm:flex"
                          >
                            {release.tracks.map((track, number) => (
                              <li key={number} className="flex gap-3">
                                <span className="w-5 shrink-0 text-right text-hero-foreground/60 tabular-nums">
                                  {number + 1}
                                </span>
                                <span className="truncate">{track}</span>
                              </li>
                            ))}
                            {release.moreTracks ? (
                              <li className="pl-8 text-hero-foreground/60">
                                {t("releases.moreTracks", {
                                  tracks: trackCountLabel(release.moreTracks),
                                })}
                              </li>
                            ) : null}
                          </ol>
                        ) : null}
                        <Button
                          asChild
                          size="lg"
                          className="mt-2 w-full rounded-full bg-hero-foreground px-6 text-brand-foreground hover:bg-hero-foreground/90 lg:w-auto"
                        >
                          <Link to={release.href}>
                            {release.cta}
                            <ArrowRight data-icon="inline-end" />
                          </Link>
                        </Button>
                      </div>
                    </ReleaseArtwork>
                  </article>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          {count > 1 ? (
            <div className="absolute inset-x-0 bottom-5 flex items-center gap-3 px-5 sm:px-10 lg:bottom-8 lg:gap-4 lg:px-16 xl:px-24">
              <span className="mr-auto shrink-0 text-sm text-hero-foreground/80">
                {index + 1} / {count}
              </span>
              <div className="flex flex-1 items-center gap-3 lg:flex-none lg:gap-1">
                {releases.map((release, position) => (
                  <button
                    key={release.id}
                    type="button"
                    aria-label={t("releases.slide", { number: position + 1 })}
                    aria-current={position === index ? "true" : undefined}
                    onClick={() => go(position)}
                    className="group grid h-11 flex-1 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring lg:w-9 lg:flex-none"
                  >
                    <span className="relative h-0.5 w-full overflow-hidden rounded-full bg-hero-foreground/35">
                      {position === index ? (
                        <span
                          key={`${release.id}:${cycle}:${stopped}`}
                          className="absolute inset-0 origin-left bg-brand"
                          style={{
                            transform: "scaleX(1)",
                            animation: !stopped
                              ? "release-progress 7s linear both"
                              : undefined,
                          }}
                        />
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
              {!reduced ? (
                <Button
                  className="sr-only focus:not-sr-only focus:rounded-xl focus:bg-background focus:text-foreground"
                  data-rotation
                  variant="secondary"
                  size="icon"
                  aria-label={t(paused ? "releases.play" : "releases.pause")}
                  onClick={() => setPaused(!paused)}
                >
                  {paused ? <Play /> : <Pause />}
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

/** One stationary blur layer follows the most visible slide during a drag. */
function ReleaseBackdrop({
  src,
  onError,
}: {
  src: string | null
  onError: () => void
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-30 bg-brand-foreground"
      />
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          onError={onError}
          className="pointer-events-none absolute inset-0 -z-20 size-full scale-125 object-cover blur-[70px] saturate-150"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-b from-background/20 via-brand-foreground/55 to-brand-foreground dark:from-background/35 dark:via-brand-foreground/65"
      />
    </>
  )
}

function ReleaseArtwork({
  src,
  onError,
  eager,
  title,
  album,
  children,
}: {
  src: string | null
  onError: () => void
  eager: boolean
  title: string
  album: boolean
  children: ReactNode
}) {
  const cover = (
    <div
      className={
        album
          ? "aspect-square w-full overflow-hidden rounded-lg bg-hero-foreground/10 shadow-2xl shadow-brand-foreground/60"
          : "size-full overflow-hidden rounded-2xl bg-hero-foreground/10 shadow-2xl shadow-brand-foreground/60"
      }
    >
      {src ? (
        <img
          src={src}
          draggable={false}
          alt={title}
          onError={onError}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className="size-full object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center bg-muted text-muted-foreground">
          <Music2 className="size-12 lg:size-16" aria-hidden="true" />
        </div>
      )}
    </div>
  )
  return (
    <div className="grid w-full min-w-0 items-end justify-items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:justify-items-start lg:gap-20">
      {children}
      <div
        className={
          album
            ? "order-1 w-[min(64vw,15rem)] sm:w-[min(74vw,20rem)] lg:order-2 lg:w-[430px] lg:justify-self-end xl:w-[480px]"
            : "order-1 aspect-square w-[min(56vw,13rem)] sm:w-[min(66vw,17rem)] lg:order-2 lg:w-[380px] lg:justify-self-end xl:w-[440px]"
        }
      >
        {album ? <AlbumVinyl>{cover}</AlbumVinyl> : cover}
      </div>
    </div>
  )
}
