import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import {
  CatalogueRouteError,
  CatalogueRouteNotFound,
  CatalogueRoutePending,
} from "@/app/route-states"
import { AlbumEditor } from "@/features/catalogue/album-editor"

export const Route = createFileRoute("/studio/albums/new")({
  component: NewAlbumPage,
  errorComponent: CatalogueRouteError,
  notFoundComponent: CatalogueRouteNotFound,
  pendingComponent: CatalogueRoutePending,
})

function NewAlbumPage() {
  return (
    <PageShell width="wide">
      <BackendRequired>
        <AlbumEditor />
      </BackendRequired>
    </PageShell>
  )
}
