import { createFileRoute } from "@tanstack/react-router"
import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { CommunityModeration } from "@/features/community/community-moderation"

export const Route = createFileRoute("/admin/community/")({
  ...appRouteBoundaries,
  component: ModerationPage,
})
function ModerationPage() {
  return (
    <PageShell width="wide">
      <BackendRequired>
        <CommunityModeration />
      </BackendRequired>
    </PageShell>
  )
}
