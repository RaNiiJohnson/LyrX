import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { CatalogueRouteError } from "@/features/catalogue/catalogue-error-boundary"
import { SongEditor } from "@/features/catalogue/song-editor"

export const Route = createFileRoute("/studio/songs/$songId/")({
  component: EditSongPage,
  errorComponent: CatalogueRouteError,
})

function EditSongPage() {
  const { songId } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <SongEditor songId={songId as Id<"songs">} />
      </BackendRequired>
    </PageShell>
  )
}
