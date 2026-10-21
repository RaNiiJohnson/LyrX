import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { AlbumEditor } from "@/components/album-editor"
import { BackendRequired } from "@/components/backend-required"
import { PageShell } from "@/components/page-shell"

export const Route = createFileRoute("/studio/albums/$albumId")({
  component: EditAlbumPage,
})

function EditAlbumPage() {
  const { albumId } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <AlbumEditor albumId={albumId as Id<"albums">} />
      </BackendRequired>
    </PageShell>
  )
}
