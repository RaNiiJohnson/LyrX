import { useLocale } from "@/app/locale-provider"
import { LoadMore } from "@/features/community/community-list"
import { SongCollection } from "@/features/discovery/discovery-cards"
import type { ViewMode } from "@/features/discovery/view-mode"
import { api } from "@lyrx/backend/convex/_generated/api"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@lyrx/ui/components/empty"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { usePaginatedQuery } from "convex-helpers/react/cache"

export function LikedSongList({ mode }: { mode: ViewMode }) {
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
        <SongCollection mode={mode} songs={page.results} />
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
