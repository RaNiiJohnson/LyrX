import { createFileRoute } from "@tanstack/react-router"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { CommunityEditor } from "@/features/community/community-editor"

export const Route = createFileRoute("/community/$contributionId/edit")({
  component: EditContributionPage,
})
function EditContributionPage() {
  const { contributionId } = Route.useParams()
  return (
    <PageShell>
      <BackendRequired>
        <CommunityEditor
          contributionId={contributionId as Id<"communityContributions">}
        />
      </BackendRequired>
    </PageShell>
  )
}
