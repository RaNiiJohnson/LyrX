import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { AlbumEditor } from "@/features/catalogue/album-editor"
import { CatalogueRouteError } from "@/features/catalogue/catalogue-error-boundary"

export const Route = createFileRoute("/studio/albums/new")({
  component: NewAlbumPage,
  errorComponent: CatalogueRouteError,
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
