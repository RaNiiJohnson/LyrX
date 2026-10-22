import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { ArtistStudio } from "@/features/catalogue/artist-studio"
import { CatalogueRouteError } from "@/features/catalogue/catalogue-error-boundary"

export const Route = createFileRoute("/studio/")({
  component: StudioPage,
  errorComponent: CatalogueRouteError,
})

function StudioPage() {
  return (
    <PageShell width="wide">
      <BackendRequired>
        <ArtistStudio />
      </BackendRequired>
    </PageShell>
  )
}
