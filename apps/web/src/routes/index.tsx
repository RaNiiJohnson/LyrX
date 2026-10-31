import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { api } from "@lyrx/backend/convex/_generated/api"
import { useLocale } from "@/app/locale-provider"
import { AlbumCard, ArtistCard } from "@/features/discovery/discovery-cards"
import {
  DiscoveryEmpty,
  DiscoveryLoading,
} from "@/features/discovery/discovery-states"
import { ReleaseSlider } from "@/features/home/release-slider"
import { SongRow } from "@/features/discovery/song-row"
import { HorizontalRow } from "@/features/discovery/horizontal-row"

export const Route = createFileRoute("/")({
  ...appRouteBoundaries,
  loader: async ({ context }) => {
    if (!context.convexQueryClient) return
    await context.queryClient.query({ ...homeQuery(), staleTime: "static" })
  },
  component: HomePage,
})

const homeQuery = () => convexQuery(api.discovery.read.home, {})

function HomePage() {
  const { t } = useLocale()
  const { data } = useSuspenseQuery(homeQuery())
  return (
    <PageShell width="wide" fullBleed>
      <div className="flex min-w-0 flex-col gap-10 sm:gap-14">
        {!data.ready ? (
          <div className="mx-auto w-full max-w-6xl px-4 pt-28">
            <DiscoveryLoading />
          </div>
        ) : (
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
        )}
      </div>
    </PageShell>
  )
}
