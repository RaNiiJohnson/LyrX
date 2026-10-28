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
import { SongCard, type DiscoverySong } from "./discovery-cards"
import { DiscoveryEmpty } from "./discovery-states"

export function SongRow({
  title,
  songs,
  popular = false,
}: {
  title: string
  songs: Array<DiscoverySong>
  popular?: boolean
}) {
  const { t } = useLocale()
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        <Button asChild variant="link" size="sm">
          <Link
            to="/songs"
            search={popular ? { sort: "popular", page: 1 } : {}}
          >
            {t("discovery.seeAll")}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
      {popular ? (
        <p className="text-sm text-muted-foreground">
          {t("discovery.popularDescription")}
        </p>
      ) : null}
      {songs.length ? (
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
