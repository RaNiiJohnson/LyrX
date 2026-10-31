import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { PageShell } from "@/app/page-shell"
import {
  CatalogueRouteError,
  CatalogueRouteNotFound,
  CatalogueRoutePending,
} from "@/app/route-states"
import { SongPreview } from "@/features/catalogue/song/song-preview"

export const Route = createFileRoute("/studio/songs/$songId/preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    fromAlbumId:
      typeof search.fromAlbumId === "string" ? search.fromAlbumId : undefined,
  }),
  component: SongPreviewPage,
  errorComponent: CatalogueRouteError,
  notFoundComponent: CatalogueRouteNotFound,
  pendingComponent: CatalogueRoutePending,
})

function SongPreviewPage() {
  const { songId } = Route.useParams()
  const { fromAlbumId } = Route.useSearch()
  return (
    <PageShell width="wide">
      <SongPreview
        songId={songId as Id<"songs">}
        fromAlbumId={fromAlbumId as Id<"albums"> | undefined}
      />
    </PageShell>
  )
}
