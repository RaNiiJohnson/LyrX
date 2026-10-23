import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import {
  CatalogueRouteError,
  CatalogueRouteNotFound,
  CatalogueRoutePending,
} from "@/app/route-states"
import { ArtistStudio } from "@/features/catalogue/artist-studio"

export const Route = createFileRoute("/studio/")({
  component: StudioPage,
  errorComponent: CatalogueRouteError,
  notFoundComponent: CatalogueRouteNotFound,
  pendingComponent: CatalogueRoutePending,
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
