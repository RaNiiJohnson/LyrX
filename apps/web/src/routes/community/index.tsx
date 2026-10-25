import { createFileRoute } from "@tanstack/react-router"
import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { CommunityList } from "@/features/community/community-list"

export const Route = createFileRoute("/community/")({
  ...appRouteBoundaries,
  component: CommunityPage,
})
function CommunityPage() {
  return (
    <PageShell width="wide">
      <BackendRequired>
        <CommunityList />
      </BackendRequired>
    </PageShell>
  )
}
