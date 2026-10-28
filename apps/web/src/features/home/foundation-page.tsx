import { useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { BackendRequired } from "@/app/backend-required"
import { useLocale } from "@/app/locale-provider"
import { AlbumCard, ArtistCard } from "@/features/discovery/discovery-cards"
import {
  DiscoveryEmpty,
  DiscoveryLoading,
} from "@/features/discovery/discovery-states"
import { ReleaseSlider } from "./release-slider"
import { SongRow } from "@/features/discovery/song-row"
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
        <SongRow title={t("discovery.newest")} songs={data.songs} />
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
        <SongRow
          title={t("discovery.popular")}
          songs={data.popularSongs}
          popular
        />
      </div>
    </>
  )
}
