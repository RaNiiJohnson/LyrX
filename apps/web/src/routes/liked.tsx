import { useLocale } from "@/app/locale-provider"
import { useViewMode, ViewModeToggle } from "@/features/discovery/view-mode"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { LikedSongList } from "@/features/interactions/liked-songs"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "convex-helpers/react/cache"

export const Route = createFileRoute("/liked")({
  ...appRouteBoundaries,
  component: LikedSongsPage,
})

function LikedSongsSection() {
  const { t } = useLocale()
  const [mode, setMode] = useViewMode()
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">
          {t("interactions.likedSongs")}
        </h1>
        <ViewModeToggle mode={mode} onChange={setMode} />
      </div>
      <LikedSongList mode={mode} />
    </section>
  )
}

function LikedSongsPage() {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()
  return (
    <PageShell width="wide">
      {current === undefined ? (
        <Skeleton className="h-32 w-full" />
      ) : current.state !== "ready" ? (
        <Button asChild>
          <Link to="/account">{t("interactions.signIn")}</Link>
        </Button>
      ) : (
        <LikedSongsSection />
      )}
    </PageShell>
  )
}
