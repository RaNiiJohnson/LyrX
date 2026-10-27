import { useId, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@lyrx/ui/components/button"
import { Badge } from "@lyrx/ui/components/badge"
import { useLocale } from "@/app/locale-provider"
import {
  CoverImage,
  type DiscoverySong,
  type DiscoveryAlbum,
} from "@/features/discovery/discovery-cards"
import { DiscoveryEmpty } from "@/features/discovery/discovery-states"

type ReleaseSong = DiscoverySong & { firstPublishedAt: number }
type ReleaseAlbum = DiscoveryAlbum & { firstPublishedAt: number }

/** A bounded presentation of existing public releases, with native touch scrolling. */
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
  const index = Math.min(active, Math.max(0, releases.length - 1))
  function go(next: number) {
    const element = ref.current
    if (!element) return
    element.scrollTo({
      left: next * element.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    })
  }
  return (
    <section
      aria-labelledby={id}
      aria-roledescription={t("releases.carousel")}
      className="flex min-w-0 flex-col gap-3"
    >
      <h2 id={id} className="text-xl font-semibold">
        {t("releases.title")}
      </h2>
      {!releases.length ? (
        <DiscoveryEmpty />
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
                  Math.max(
                    0,
                    Math.min(
                      releases.length - 1,
                      index + (event.key === "ArrowRight" ? 1 : -1)
                    )
                  )
                )
              }
            }}
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {releases.map((release, position) => (
              <article
                key={release.id}
                aria-label={`${position + 1} / ${releases.length}`}
                className="relative w-full shrink-0 snap-start overflow-hidden rounded-2xl bg-muted"
              >
                <CoverImage
                  src={release.artworkUrl}
                  className="h-56 w-full rounded-none sm:h-80"
                />
                <div className="flex flex-col items-start gap-3 bg-card p-5 text-card-foreground sm:p-7">
                  <Badge variant="secondary">{release.label}</Badge>
                  <h3 className="text-2xl font-semibold break-words sm:text-3xl">
                    {release.title}
                  </h3>
                  <p className="break-words text-muted-foreground">
                    {release.context}
                  </p>
                  <Button asChild>
                    <Link to={release.href}>
                      {t("releases.open")}
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {releases.length > 1 ? (
            <div className="flex items-center justify-end gap-3">
              <span
                className="text-sm text-muted-foreground"
                aria-live="polite"
              >
                {index + 1} / {releases.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("discovery.previousItems")}
                disabled={index === 0}
                onClick={() => go(index - 1)}
              >
                <ArrowLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("discovery.nextItems")}
                disabled={index === releases.length - 1}
                onClick={() => go(index + 1)}
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
