import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { BackendRequired } from "@/components/backend-required"
import { CatalogueErrorBoundary } from "@/components/catalogue-error-boundary"
import { PageShell } from "@/components/page-shell"
import { SongEditor } from "@/components/song-editor"

export const Route = createFileRoute("/studio/songs/$songId")({
  component: EditSongPage,
})

function EditSongPage() {
  const { songId } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <CatalogueErrorBoundary>
          <SongEditor songId={songId as Id<"songs">} />
        </CatalogueErrorBoundary>
      </BackendRequired>
    </PageShell>
  )
}
