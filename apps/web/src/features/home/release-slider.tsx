import { useEffect, useId, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react"
import { Button } from "@lyrx/ui/components/button"
import { Badge } from "@lyrx/ui/components/badge"
import { useLocale } from "@/app/locale-provider"
import type {
  DiscoverySong,
  DiscoveryAlbum,
} from "@/features/discovery/discovery-cards"
import { DiscoveryEmpty } from "@/features/discovery/discovery-states"

type ReleaseSong = DiscoverySong & { firstPublishedAt: number }
type ReleaseAlbum = DiscoveryAlbum & { firstPublishedAt: number }

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
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [reduced, setReduced] = useState(true)
  const [hidden, setHidden] = useState(false)
  const releases = [
    ...songs.map((song) => ({
      ...song,
      context: song.primaryArtist,
      label: t(
        song.origin === "community"
          ? "discovery.sourceCommunity"
          : "discovery.sourceArtist"
      ),
    })),
    ...albums.map((album) => ({
      ...album,
      context: album.artistName,
      label: t("discovery.albums"),
    })),
  ]
    .sort(
      (a, b) =>
        b.firstPublishedAt - a.firstPublishedAt || a.id.localeCompare(b.id)
    )
    .slice(0, 6)
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
    return () => {
      preference.removeEventListener("change", update)
      document.removeEventListener("visibilitychange", visibility)
    }
  }, [])
  useEffect(() => {
    if (count < 2 || paused || hovered || hidden || reduced) return
    const timer = setTimeout(() => {
      const next = (index + 1) % count
      ref.current?.scrollTo({
        left: next * ref.current.clientWidth,
        behavior: "smooth",
      })
      setActive(next)
    }, 7000)
    return () => clearTimeout(timer)
  }, [count, index, paused, hovered, hidden, reduced])
  function go(next: number) {
    setActive(next)
    ref.current?.scrollTo({
      left: next * ref.current.clientWidth,
      behavior: reduced ? "instant" : "smooth",
    })
  }
  return (
    <section
      aria-labelledby={id}
      aria-roledescription={t("releases.carousel")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (!(
          event.target instanceof Element &&
          event.target.closest("[data-rotation]")
        ))
          setPaused(true)
      }}
      className="relative isolate -mt-20 min-w-0 overflow-hidden rounded-3xl bg-muted sm:-mt-24"
    >
      <h1 id={id} className="sr-only">
        {t("releases.title")}
      </h1>
      {!count ? (
        <div className="flex min-h-80 items-center justify-center p-6 sm:min-h-[34rem]">
          <DiscoveryEmpty />
        </div>
      ) : (
        <>
          <div
            onPointerDown={() => setPaused(true)}
            ref={ref}
            tabIndex={0}
            role="region"
            aria-labelledby={id}
            onScroll={(event) => {
              const element = event.currentTarget
              setActive(
                Math.round(
                  element.scrollLeft / Math.max(1, element.clientWidth)
                )
              )
            }}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault()
                go(
                  (index + (event.key === "ArrowRight" ? 1 : count - 1)) % count
                )
              }
            }}
            className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-scrollbar]:hidden"
          >
            {releases.map((release, position) => (
              <article
                key={release.id}
                aria-label={`${position + 1} / ${count}`}
                inert={position !== index}
                className="relative isolate flex min-h-[30rem] w-full shrink-0 snap-start items-end overflow-hidden px-6 pt-24 pb-24 text-hero-foreground sm:min-h-[36rem] sm:px-12 sm:pb-28"
              >
                <img
                  src={
                    release.artworkUrl ?? "/images/lyrx-songwriter-hero.webp"
                  }
                  alt=""
                  fetchPriority={position === 0 ? "high" : "auto"}
                  loading={position === 0 ? "eager" : "lazy"}
                  onError={(event) => {
                    if (
                      event.currentTarget.getAttribute("src") !==
                      "/images/lyrx-songwriter-hero.webp"
                    ) {
                      event.currentTarget.src =
                        "/images/lyrx-songwriter-hero.webp"
                    }
                  }}
                  className="absolute inset-0 -z-20 size-full object-cover object-center"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-linear-to-r from-brand-foreground/95 via-brand-foreground/65 to-brand-foreground/25"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-linear-to-t from-brand-foreground/90 via-transparent to-transparent"
                />
                <div className="flex w-full max-w-2xl flex-col items-start gap-4">
                  <Badge variant="secondary">{release.label}</Badge>
                  <h2 className="font-serif text-4xl leading-tight break-words sm:text-6xl">
                    {release.title}
                  </h2>
                  <p className="text-lg break-words">{release.context}</p>
                  <Button asChild size="lg">
                    <Link to={release.href}>
                      {t("releases.open")}
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {count > 1 ? (
            <div className="absolute inset-x-0 bottom-5 flex flex-wrap items-center justify-end gap-2 px-5 sm:bottom-7 sm:px-10">
              <span className="mr-auto text-sm text-hero-foreground">
                {index + 1} / {count}
              </span>
              <div className="flex items-center gap-1">
                {releases.map((release, position) => (
                  <button
                    key={release.id}
                    type="button"
                    aria-label={t("releases.slide", { number: position + 1 })}
                    aria-current={position === index ? "true" : undefined}
                    onClick={() => go(position)}
                    className="group grid h-11 w-7 place-items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring sm:w-9"
                  >
                    <span
                      className={
                        position === index
                          ? "h-1 w-full rounded-full bg-brand"
                          : "h-1 w-full rounded-full bg-hero-foreground/40 group-hover:bg-hero-foreground/80"
                      }
                    />
                  </button>
                ))}
              </div>
              {!reduced ? (
                <Button
                  data-rotation
                  variant="secondary"
                  size="icon"
                  aria-label={t(paused ? "releases.play" : "releases.pause")}
                  onClick={() => setPaused(!paused)}
                >
                  {paused ? <Play /> : <Pause />}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="icon"
                aria-label={t("discovery.previousItems")}
                onClick={() => go((index + count - 1) % count)}
              >
                <ArrowLeft />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label={t("discovery.nextItems")}
                onClick={() => go((index + 1) % count)}
              >
                <ArrowRight />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
