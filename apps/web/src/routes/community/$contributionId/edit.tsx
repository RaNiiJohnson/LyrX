import { createFileRoute } from "@tanstack/react-router"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { CommunityEditor } from "@/features/community/community-editor"

export const Route = createFileRoute("/community/$contributionId/edit")({
  ...appRouteBoundaries,
  component: EditContributionPage,
})
function EditContributionPage() {
  const { contributionId } = Route.useParams()
  return (
    <PageShell>
      <CommunityEditor
        contributionId={contributionId as Id<"communityContributions">}
      />
    </PageShell>
  )
}
