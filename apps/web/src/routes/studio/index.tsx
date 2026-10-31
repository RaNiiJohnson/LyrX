import { createFileRoute } from "@tanstack/react-router"

import { PageShell } from "@/app/page-shell"
import {
  CatalogueRouteError,
  CatalogueRouteNotFound,
  CatalogueRoutePending,
} from "@/app/route-states"
import { ArtistAccess } from "@/features/catalogue/shared/artist-access"
import { CatalogueDashboard } from "@/features/catalogue/studio/catalogue-dashboard"

export const Route = createFileRoute("/studio/")({
  validateSearch: (
    search: Record<string, unknown>
  ): { tab?: "songs" | "albums" } =>
    search.tab === "albums" || search.tab === "songs"
      ? { tab: search.tab }
      : {},
  component: StudioPage,
  errorComponent: CatalogueRouteError,
  notFoundComponent: CatalogueRouteNotFound,
  pendingComponent: CatalogueRoutePending,
})

function StudioPage() {
  return (
    <PageShell width="wide" footerBelowFold>
      <ArtistAccess>{() => <CatalogueDashboard />}</ArtistAccess>
    </PageShell>
  )
}
