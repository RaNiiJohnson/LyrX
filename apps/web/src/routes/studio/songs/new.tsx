import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { CatalogueRouteError } from "@/features/catalogue/catalogue-error-boundary"
import { SongEditor } from "@/features/catalogue/song-editor"

export const Route = createFileRoute("/studio/songs/new")({
  component: NewSongPage,
  errorComponent: CatalogueRouteError,
})

function NewSongPage() {
  return (
    <PageShell width="wide">
      <BackendRequired>
        <SongEditor />
      </BackendRequired>
    </PageShell>
  )
}
