import { useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { useLocale } from "@/app/locale-provider"
import { createFileRoute, Link } from "@tanstack/react-router"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { LikedSongList } from "@/features/interactions/liked-songs"

export const Route = createFileRoute("/liked")({
  ...appRouteBoundaries,
  component: LikedSongsPage,
})

function LikedSongsPage() {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()
  return (
    <PageShell>
      {current === undefined ? (
        <Skeleton className="h-32 w-full" />
      ) : current.state !== "ready" ? (
        <Button asChild>
          <Link to="/account">{t("interactions.signIn")}</Link>
        </Button>
      ) : (
        <section className="flex flex-col gap-6">
          <h1 className="text-3xl font-semibold">
            {t("interactions.likedSongs")}
          </h1>
          <LikedSongList />
        </section>
      )}
    </PageShell>
  )
}
