import { createFileRoute } from "@tanstack/react-router"
import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { LikedSongs } from "@/features/interactions/liked-songs"

export const Route = createFileRoute("/liked")({
  ...appRouteBoundaries,
  component: () => (
    <PageShell>
      <BackendRequired>
        <LikedSongs />
      </BackendRequired>
    </PageShell>
  ),
})
