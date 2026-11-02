import { useLocale } from "@/app/locale-provider"
import { LoadMore } from "@/features/community/community-list"
import { SongCard } from "@/features/discovery/discovery-cards"
import { api } from "@lyrx/backend/convex/_generated/api"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@lyrx/ui/components/empty"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { usePaginatedQuery } from "convex-helpers/react/cache"

export function LikedSongList() {
  const { t } = useLocale()
  const page = usePaginatedQuery(
    api.interactions.read.likedSongs,
    {},
    { initialNumItems: 24 }
  )
  return (
    <section className="flex flex-col gap-6">
      {page.status === "LoadingFirstPage" ? (
        <Skeleton className="h-32 w-full" />
      ) : page.results.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {page.results.map((song) => (
            // Same cover cards as the home page; liked items carry no artwork
            // yet, so the card uses its lettered cover.
            <SongCard
              key={`${song.origin}:${song.id}`}
              song={{ ...song, artworkUrl: null }}
              presentation="cover"
            />
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("interactions.emptyLiked")}</EmptyTitle>
            <EmptyDescription>
              {t("interactions.unavailableLiked")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      <LoadMore status={page.status} loadMore={() => page.loadMore(24)} />
    </section>
  )
}
