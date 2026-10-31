import { convexQuery } from "@convex-dev/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { useSuspenseQuery } from "@tanstack/react-query"
import { SongReadOnly } from "@/features/catalogue/song/song-read-only"
import { SongInteractions } from "@/features/interactions/song-interactions"
import { RecordPublicView } from "@/features/discovery/record-public-view"

export const Route = createFileRoute("/songs/$songId")({
  ...appRouteBoundaries,
  component: PublicSongPage,
  loader: async ({ context, params }) => {
    if (!context.convexQueryClient) return
    const songId = params.songId as Id<"songs">
    const detail = await context.queryClient.query({
      ...convexQuery(api.catalogue.read.getPublishedSong, { songId }),
      staleTime: "static",
    })
    if (!detail) throw notFound()
  },
})

function PublicSongPage() {
  const { songId: id } = Route.useParams()
  const songId = id as Id<"songs">
  const { data: detail } = useSuspenseQuery(
    convexQuery(api.catalogue.read.getPublishedSong, { songId })
  )
  if (!detail) throw notFound()
  return (
    <PageShell width="wide">
      <RecordPublicView origin="artist" sourceId={songId} />
      <SongReadOnly detail={detail} />
      <SongInteractions key={songId} sourceId={songId} />
    </PageShell>
  )
}
