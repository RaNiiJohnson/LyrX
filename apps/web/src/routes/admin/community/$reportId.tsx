import { createFileRoute } from "@tanstack/react-router"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { CommunityReport } from "@/features/community/community-moderation"

export const Route = createFileRoute("/admin/community/$reportId")({
  ...appRouteBoundaries,
  component: ReportPage,
})
function ReportPage() {
  const { reportId } = Route.useParams()
  return (
    <PageShell width="wide">
      <CommunityReport reportId={reportId as Id<"communityReports">} />
    </PageShell>
  )
}
