import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/components/backend-required"
import { PageShell } from "@/components/page-shell"
import { SongEditor } from "@/components/song-editor"

export const Route = createFileRoute("/studio/songs/new")({
  component: NewSongPage,
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
