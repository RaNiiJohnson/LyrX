import { vi } from "vitest"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Route as ProfileRoute } from "@/routes/profiles/$handle"
import { Route as HomeRoute } from "@/routes/index"
import { Route as CommunityRoute } from "@/routes/community/$contributionId/index"

export function PublicProfile({ handle }: { handle: string }) {
  vi.spyOn(ProfileRoute, "useParams").mockReturnValue({ handle })
  const Component = ProfileRoute.options.component!
  return <Component />
}
export const FoundationPage = HomeRoute.options.component!
export function CommunityReader({
  contributionId,
}: {
  contributionId: Id<"communityContributions">
}) {
  vi.spyOn(CommunityRoute, "useParams").mockReturnValue({ contributionId })
  const Component = CommunityRoute.options.component!
  return <Component />
}
