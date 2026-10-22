import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { AlbumEditor } from "@/features/catalogue/album-editor"
import { CatalogueRouteError } from "@/features/catalogue/catalogue-error-boundary"

export const Route = createFileRoute("/studio/albums/$albumId/")({
  component: EditAlbumPage,
  errorComponent: CatalogueRouteError,
})

function EditAlbumPage() {
  const { albumId } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <AlbumEditor albumId={albumId as Id<"albums">} />
      </BackendRequired>
    </PageShell>
  )
}
