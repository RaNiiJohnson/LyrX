import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Music2, Pause, Play } from "lucide-react"
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
  const [held, setHeld] = useState(false)
  const [focused, setFocused] = useState(false)
  const [cycle, setCycle] = useState(0)
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
  const stopped =
    count < 2 || paused || hovered || held || focused || hidden || reduced
  useEffect(() => {
    if (stopped) return
    const timer = setTimeout(() => {
      const next = (index + 1) % count
      ref.current?.scrollTo({
        left: next * ref.current.clientWidth,
        behavior: "smooth",
      })
      setActive(next)
    }, 7000)
    return () => clearTimeout(timer)
  }, [count, index, stopped, cycle])
  function go(next: number) {
    setCycle((value) => value + 1)
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
                className="relative isolate flex min-h-[46rem] w-full shrink-0 snap-start items-center overflow-hidden px-5 pt-24 pb-28 text-hero-foreground lg:min-h-[44rem] lg:px-6 lg:pt-40 lg:pb-36"
              >
                <ReleaseArtwork
                  key={release.artworkUrl ?? "missing"}
                  src={release.artworkUrl}
                  active={position === index}
                  eager={position === 0}
                  title={release.title}
                >
                  <div className="order-2 flex w-full min-w-0 flex-col items-center gap-4 text-center lg:order-1 lg:items-start lg:gap-5 lg:text-left">
                    <Badge
                      variant="secondary"
                      className="border-hero-foreground/10 bg-hero-foreground/15 text-hero-foreground"
                    >
                      {release.label}
                    </Badge>
                    <h2 className="font-serif text-5xl leading-tight break-words lg:text-7xl">
                      {release.title}
                    </h2>
                    <p className="text-lg break-words text-hero-foreground/90 lg:text-xl">
                      {release.context}
                    </p>
                    <Button
                      asChild
                      size="lg"
                      className="mt-2 w-full rounded-full bg-hero-foreground px-6 text-brand-foreground hover:bg-hero-foreground/90 lg:w-auto"
                    >
                      <Link to={release.href}>
                        {t("releases.open")}
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </div>
                </ReleaseArtwork>
              </article>
            ))}
          </div>
          {count > 1 ? (
            <div className="absolute inset-x-0 bottom-5 mx-auto flex max-w-6xl items-center gap-3 px-5 lg:bottom-8 lg:gap-4 lg:px-6">
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
                  className="hidden rounded-xl border-hero-foreground/20 bg-background/30 text-hero-foreground hover:bg-background/50 lg:inline-flex"
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
                className="hidden rounded-xl border-hero-foreground/20 bg-background/30 text-hero-foreground hover:bg-background/50 lg:inline-flex"
                aria-label={t("discovery.previousItems")}
                onClick={() => go((index + count - 1) % count)}
              >
                <ArrowLeft />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="hidden rounded-xl border-hero-foreground/20 bg-background/30 text-hero-foreground hover:bg-background/50 lg:inline-flex"
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

/** Only the active slide creates an expensive blurred image layer. */
function ReleaseArtwork({
  src,
  active,
  eager,
  title,
  children,
}: {
  src: string | null
  active: boolean
  eager: boolean
  title: string
  children: ReactNode
}) {
  const [failed, setFailed] = useState(false)
  const image = src && !failed ? src : null
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-30 bg-brand-foreground"
      />
      {image && active ? (
        <img
          src={image}
          alt=""
          onError={() => setFailed(true)}
          className="pointer-events-none absolute inset-0 -z-20 size-full scale-125 object-cover blur-[70px] saturate-150"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-b from-background/20 via-brand-foreground/55 to-brand-foreground dark:from-background/35 dark:via-brand-foreground/65"
      />
      <div className="mx-auto grid w-full max-w-6xl min-w-0 items-end justify-items-center gap-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-20">
        {children}
        <div className="order-1 size-[min(66vw,17rem)] overflow-hidden rounded-2xl bg-hero-foreground/10 shadow-2xl shadow-brand-foreground/60 lg:order-2 lg:size-[380px]">
          {image ? (
            <img
              src={image}
              alt={title}
              onError={() => setFailed(true)}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center bg-muted text-muted-foreground">
              <Music2 className="size-16" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
