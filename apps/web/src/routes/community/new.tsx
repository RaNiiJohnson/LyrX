import { createFileRoute } from "@tanstack/react-router"
import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { CommunityEditor } from "@/features/community/community-editor"

export const Route = createFileRoute("/community/new")({
  ...appRouteBoundaries,
  component: NewContributionPage,
})
function NewContributionPage() {
  return (
    <PageShell>
      <BackendRequired>
        <CommunityEditor />
      </BackendRequired>
    </PageShell>
  )
}
