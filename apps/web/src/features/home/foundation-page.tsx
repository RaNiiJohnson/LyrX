import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { ArrowRight } from "lucide-react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import { BackendRequired } from "@/app/backend-required"
import { useLocale } from "@/app/locale-provider"
import {
  AlbumCard,
  ArtistCard,
  SongCard,
} from "@/features/discovery/discovery-cards"
import {
  DiscoveryEmpty,
  DiscoveryLoading,
} from "@/features/discovery/discovery-states"
import { ReleaseSlider } from "./release-slider"
import { HorizontalRow } from "@/features/discovery/horizontal-row"

export function FoundationPage() {
  return (
    <div className="flex min-w-0 flex-col gap-10 sm:gap-14">
      <BackendRequired>
        <HomeDiscovery />
      </BackendRequired>
    </div>
  )
}

function HomeDiscovery() {
  const { t } = useLocale()
  const data = useQuery(api.discovery.read.home, {})
  if (!data?.ready)
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pt-28">
        <DiscoveryLoading />
      </div>
    )
  return (
    <>
      <ReleaseSlider songs={data.songs} albums={data.albums} />
      <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-10 px-4 sm:gap-14 sm:px-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{t("discovery.newest")}</h2>
            <Button asChild variant="link" size="sm">
              <Link to="/songs">
                {t("discovery.seeAll")}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          {data.songs.length ? (
            <div className="grid gap-x-4 sm:grid-cols-2 sm:gap-y-4 lg:grid-cols-3">
              {data.songs.map((song) => (
                <SongCard key={`${song.origin}:${song.id}`} song={song} />
              ))}
            </div>
          ) : (
            <DiscoveryEmpty />
          )}
        </section>
        <HorizontalRow
          title={t("discovery.artists")}
          href="/artists"
          empty={!data.artists.length}
        >
          {data.artists.length ? (
            data.artists.map((artist) => (
              <ArtistCard key={artist.handle} artist={artist} />
            ))
          ) : (
            <DiscoveryEmpty />
          )}
        </HorizontalRow>
        <HorizontalRow
          title={t("discovery.albums")}
          href="/albums"
          empty={!data.albums.length}
        >
          {data.albums.length ? (
            data.albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))
          ) : (
            <DiscoveryEmpty />
          )}
        </HorizontalRow>
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{t("discovery.popular")}</h2>
            <Button asChild variant="link" size="sm">
              <Link to="/songs" search={{ sort: "popular", page: 1 }}>
                {t("discovery.seeAll")}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("discovery.popularDescription")}
          </p>
          {data.popularSongs.length ? (
            <div className="grid gap-x-4 sm:grid-cols-2 sm:gap-y-4 lg:grid-cols-3">
              {data.popularSongs.map((song) => (
                <SongCard key={`${song.origin}:${song.id}`} song={song} />
              ))}
            </div>
          ) : (
            <DiscoveryEmpty />
          )}
        </section>
      </div>
    </>
  )
}
