import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { AlbumEditor } from "@/components/album-editor"
import { BackendRequired } from "@/components/backend-required"
import { CatalogueErrorBoundary } from "@/components/catalogue-error-boundary"
import { PageShell } from "@/components/page-shell"

export const Route = createFileRoute("/studio/albums/$albumId")({
  component: EditAlbumPage,
})

function EditAlbumPage() {
  const { albumId } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <CatalogueErrorBoundary>
          <AlbumEditor albumId={albumId as Id<"albums">} />
        </CatalogueErrorBoundary>
      </BackendRequired>
    </PageShell>
  )
}
