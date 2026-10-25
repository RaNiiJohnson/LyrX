import { convexQuery } from "@convex-dev/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { CommunityReader } from "@/features/community/community-reader"

export const Route = createFileRoute("/community/$contributionId/")({
  component: ContributionPage,
  loader: async ({ context, params }) => {
    if (!context.convexQueryClient) return
    const row = await context.queryClient.query({
      ...convexQuery(api.community.read.getPublished, {
        contributionId: params.contributionId as Id<"communityContributions">,
      }),
      staleTime: "static",
    })
    if (!row) throw notFound()
  },
})
function ContributionPage() {
  const { contributionId } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <CommunityReader
          contributionId={contributionId as Id<"communityContributions">}
        />
      </BackendRequired>
    </PageShell>
  )
}
