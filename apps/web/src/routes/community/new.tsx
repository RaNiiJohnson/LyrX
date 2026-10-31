import { createFileRoute } from "@tanstack/react-router"
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
      <CommunityEditor />
    </PageShell>
  )
}
