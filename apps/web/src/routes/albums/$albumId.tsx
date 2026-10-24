import { convexQuery } from "@convex-dev/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { PublicAlbum } from "@/features/catalogue/album/public-album"

export const Route = createFileRoute("/albums/$albumId")({
  ...appRouteBoundaries,
  component: PublicAlbumPage,
  loader: async ({ context, params }) => {
    if (!context.convexQueryClient) return
    const albumId = params.albumId as Id<"albums">
    const detail = await context.queryClient.query({
      ...convexQuery(api.catalogue.getPublishedAlbum, { albumId }),
      staleTime: "static",
    })
    if (!detail) throw notFound()
  },
})

function PublicAlbumPage() {
  const { albumId } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <PublicAlbum albumId={albumId as Id<"albums">} />
      </BackendRequired>
    </PageShell>
  )
}
