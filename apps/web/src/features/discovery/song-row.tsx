import { Link } from "@tanstack/react-router"
import { useId } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@lyrx/ui/components/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@lyrx/ui/components/carousel"
import { useLocale } from "@/app/locale-provider"
import type { CatalogueSearch } from "./catalogue-search"
import { SongCard, SongCollection, type DiscoverySong } from "./discovery-cards"
import { DiscoveryEmpty } from "./discovery-states"

export function SongRow({
  title,
  songs,
  popular = false,
  seeAllSearch,
  mode = "cards",
}: {
  title: string
  songs: Array<DiscoverySong>
  popular?: boolean
  /** Filter applied by "See all", e.g. one artist's songs. */
  seeAllSearch?: Partial<CatalogueSearch>
  /** "list" shows one song per line instead of the cover carousel. */
  mode?: "cards" | "list"
}) {
  const { t } = useLocale()
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        {songs.length ? (
          <Button asChild variant="link" size="sm">
            <Link
              to="/songs"
              search={
                seeAllSearch ?? (popular ? { sort: "popular", page: 1 } : {})
              }
            >
              {t("discovery.seeAll")}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        ) : null}
      </div>
      {popular ? (
        <p className="text-sm text-muted-foreground">
          {t("discovery.popularDescription")}
        </p>
      ) : null}
      {songs.length && mode === "list" ? (
        <SongCollection mode="list" songs={songs} />
      ) : songs.length ? (
        <Carousel
          opts={{ align: "start", containScroll: "trimSnaps" }}
          aria-labelledby={id}
          aria-roledescription={t("releases.carousel")}
          tabIndex={0}
          className="min-w-0 cursor-grab rounded-xl outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <CarouselContent className="ml-0 gap-4">
            {songs.map((song) => (
              <CarouselItem
                key={`${song.origin}:${song.id}`}
                className="basis-36 pl-0 sm:basis-44 lg:basis-48"
              >
                <SongCard song={song} presentation="cover" />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      ) : (
        <DiscoveryEmpty />
      )}
    </section>
  )
}
