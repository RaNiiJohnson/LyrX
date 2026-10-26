import { convexQuery } from "@convex-dev/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { api } from "@lyrx/backend/convex/_generated/api"
import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { PublicProfile } from "@/features/profile/public-profile"

export const Route = createFileRoute("/artists/$handle")({
  ...appRouteBoundaries,
  component: ArtistPage,
  loader: async ({ context, params }) => {
    if (!context.convexQueryClient) return
    const profile = await context.queryClient.query({
      ...convexQuery(api.members.publicByHandle, { handle: params.handle }),
      staleTime: "static",
    })
    if (!profile || profile.role !== "artist") throw notFound()
  },
})
function ArtistPage() {
  const { handle } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <PublicProfile handle={handle} />
      </BackendRequired>
    </PageShell>
  )
}
