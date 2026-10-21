import { createFileRoute } from "@tanstack/react-router"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { BackendRequired } from "@/components/backend-required"
import { SongPreview } from "@/components/catalogue-preview"
import { PageShell } from "@/components/page-shell"

export const Route = createFileRoute("/studio/songs/$songId/preview")({
  component: SongPreviewPage,
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
