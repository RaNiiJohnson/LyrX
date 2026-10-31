import { createFileRoute } from "@tanstack/react-router"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { MyContributions } from "@/features/community/community-list"

export const Route = createFileRoute("/community/mine")({
  ...appRouteBoundaries,
  component: MyContributionsPage,
})
function MyContributionsPage() {
  return (
    <PageShell width="wide">
      <MyContributions />
    </PageShell>
  )
}
