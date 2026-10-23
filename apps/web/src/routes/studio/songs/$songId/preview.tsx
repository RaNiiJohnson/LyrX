import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import {
  CatalogueRouteError,
  CatalogueRouteNotFound,
  CatalogueRoutePending,
} from "@/app/route-states"
import { SongPreview } from "@/features/catalogue/song/song-preview"

export const Route = createFileRoute("/studio/songs/$songId/preview")({
  component: SongPreviewPage,
  errorComponent: CatalogueRouteError,
  notFoundComponent: CatalogueRouteNotFound,
  pendingComponent: CatalogueRoutePending,
})

function SongPreviewPage() {
  const { songId } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <SongPreview songId={songId as Id<"songs">} />
      </BackendRequired>
    </PageShell>
  )
}
