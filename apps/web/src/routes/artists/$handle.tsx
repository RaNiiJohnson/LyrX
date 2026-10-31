import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { api } from "@lyrx/backend/convex/_generated/api"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { ArtistCatalogue } from "@/features/profile/artist-catalogue"
import { ProfileHeader } from "@/features/profile/profile-header"

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
  const { data: profile } = useSuspenseQuery(
    convexQuery(api.members.publicByHandle, { handle })
  )
  if (!profile || profile.role !== "artist") throw notFound()
  return (
    <PageShell width="wide">
      <section className="flex min-w-0 flex-col gap-7">
        <ProfileHeader
          key={profile.artist?.bannerUrl ?? "no-banner"}
          profile={profile}
        />
        {profile.bio ? (
          <p className="max-w-3xl leading-7 break-words whitespace-pre-wrap">
            {profile.bio}
          </p>
        ) : null}
        {profile.artist ? <ArtistCatalogue profile={profile} /> : null}
      </section>
    </PageShell>
  )
}
