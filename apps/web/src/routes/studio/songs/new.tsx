import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import {
  CatalogueRouteError,
  CatalogueRouteNotFound,
  CatalogueRoutePending,
} from "@/app/route-states"
import { SongEditor } from "@/features/catalogue/song-editor"

export const Route = createFileRoute("/studio/songs/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    albumId: typeof search.albumId === "string" ? search.albumId : undefined,
  }),
  component: NewSongPage,
  errorComponent: CatalogueRouteError,
  notFoundComponent: CatalogueRouteNotFound,
  pendingComponent: CatalogueRoutePending,
})

function NewSongPage() {
  const { albumId } = Route.useSearch()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <SongEditor initialAlbumId={albumId} />
      </BackendRequired>
    </PageShell>
  )
}
