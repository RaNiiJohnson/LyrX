import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import {
  CatalogueRouteError,
  CatalogueRouteNotFound,
  CatalogueRoutePending,
} from "@/app/route-states"
import { AlbumPreview } from "@/features/catalogue/album/album-preview"

export const Route = createFileRoute("/studio/albums/$albumId/preview")({
  component: AlbumPreviewPage,
  errorComponent: CatalogueRouteError,
  notFoundComponent: CatalogueRouteNotFound,
  pendingComponent: CatalogueRoutePending,
})

function AlbumPreviewPage() {
  const { albumId } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <AlbumPreview albumId={albumId as Id<"albums">} />
      </BackendRequired>
    </PageShell>
  )
}
