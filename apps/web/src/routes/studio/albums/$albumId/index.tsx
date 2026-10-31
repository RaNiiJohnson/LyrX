import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { PageShell } from "@/app/page-shell"
import {
  CatalogueRouteError,
  CatalogueRouteNotFound,
  CatalogueRoutePending,
} from "@/app/route-states"
import { AlbumEditor } from "@/features/catalogue/album-editor"

export const Route = createFileRoute("/studio/albums/$albumId/")({
  component: EditAlbumPage,
  errorComponent: CatalogueRouteError,
  notFoundComponent: CatalogueRouteNotFound,
  pendingComponent: CatalogueRoutePending,
})

function EditAlbumPage() {
  const { albumId } = Route.useParams()
  return (
    <PageShell width="wide">
      <AlbumEditor albumId={albumId as Id<"albums">} />
    </PageShell>
  )
}
