import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { AlbumPreview } from "@/components/catalogue-preview"
import { BackendRequired } from "@/components/backend-required"
import { CatalogueErrorBoundary } from "@/components/catalogue-error-boundary"
import { PageShell } from "@/components/page-shell"

export const Route = createFileRoute("/studio/albums/$albumId/preview")({
  component: AlbumPreviewPage,
})

function AlbumPreviewPage() {
  const { albumId } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <CatalogueErrorBoundary>
          <AlbumPreview albumId={albumId as Id<"albums">} />
        </CatalogueErrorBoundary>
      </BackendRequired>
    </PageShell>
  )
}
