import { convexQuery } from "@convex-dev/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { PublicSong } from "@/features/catalogue/song/public-song"

export const Route = createFileRoute("/songs/$songId")({
  ...appRouteBoundaries,
  component: PublicSongPage,
  loader: async ({ context, params }) => {
    if (!context.convexQueryClient) return
    const songId = params.songId as Id<"songs">
    const detail = await context.queryClient.query({
      ...convexQuery(api.catalogue.getPublishedSong, { songId }),
      staleTime: "static",
    })
    if (!detail) throw notFound()
  },
})

function PublicSongPage() {
  const { songId } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <PublicSong songId={songId as Id<"songs">} />
      </BackendRequired>
    </PageShell>
  )
}
