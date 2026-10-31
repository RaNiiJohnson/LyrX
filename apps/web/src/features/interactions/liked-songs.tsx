import { Link } from "@tanstack/react-router"
import { usePaginatedQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Badge } from "@lyrx/ui/components/badge"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@lyrx/ui/components/empty"
import { useLocale } from "@/app/locale-provider"
import { LoadMore } from "@/features/community/community-list"

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
        <ul className="flex flex-col gap-4">
          {page.results.map((song) => (
            <li
              key={`${song.origin}:${song.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border p-4"
            >
              <Link
                to={song.href}
                className="min-w-0 wrap-anywhere hover:underline"
              >
                <strong>{song.title}</strong>
                <p className="text-sm text-muted-foreground">
                  {song.primaryArtist}
                </p>
              </Link>
              <Badge variant="secondary">
                {t(
                  song.origin === "artist"
                    ? "discovery.sourceArtist"
                    : "discovery.sourceCommunity"
                )}
              </Badge>
            </li>
          ))}
        </ul>
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
