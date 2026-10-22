import { createFileRoute } from "@tanstack/react-router"

import { ArtistStudio } from "@/components/artist-studio"
import { BackendRequired } from "@/components/backend-required"
import { CatalogueErrorBoundary } from "@/components/catalogue-error-boundary"
import { PageShell } from "@/components/page-shell"

export const Route = createFileRoute("/studio/")({ component: StudioPage })

function StudioPage() {
  return (
    <PageShell width="wide">
      <BackendRequired>
        <CatalogueErrorBoundary>
          <ArtistStudio />
        </CatalogueErrorBoundary>
      </BackendRequired>
    </PageShell>
  )
}
