import { createFileRoute } from "@tanstack/react-router"

import { AlbumEditor } from "@/components/album-editor"
import { BackendRequired } from "@/components/backend-required"
import { PageShell } from "@/components/page-shell"

export const Route = createFileRoute("/studio/albums/new")({
  component: NewAlbumPage,
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
