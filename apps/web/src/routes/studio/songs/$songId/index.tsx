import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import {
  CatalogueRouteError,
  CatalogueRouteNotFound,
  CatalogueRoutePending,
} from "@/app/route-states"
import { SongEditor } from "@/features/catalogue/song-editor"

export const Route = createFileRoute("/studio/songs/$songId/")({
  validateSearch: (search: Record<string, unknown>) => ({
    fromAlbumId:
      typeof search.fromAlbumId === "string" ? search.fromAlbumId : undefined,
  }),
  component: EditSongPage,
  errorComponent: CatalogueRouteError,
  notFoundComponent: CatalogueRouteNotFound,
  pendingComponent: CatalogueRoutePending,
})

function EditSongPage() {
  const { songId } = Route.useParams()
  const { fromAlbumId } = Route.useSearch()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <SongEditor
          songId={songId as Id<"songs">}
          returnAlbumId={fromAlbumId}
        />
      </BackendRequired>
    </PageShell>
  )
}
