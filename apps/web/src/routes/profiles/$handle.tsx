import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { DEFAULT_LOCALE, formatMessage } from "@lyrx/shared"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { PageShell } from "@/app/page-shell"
import { RouteBoundaryShell } from "@/app/route-boundary-shell"
import {
  PublicProfileSkeleton,
  ArtistCatalogue,
} from "@/features/profile/artist-catalogue"
import { ProfileHeader } from "@/features/profile/profile-header"
import { getErrorMessage } from "@/lib/errors"

export const Route = createFileRoute("/profiles/$handle")({
  component: PublicProfilePage,
  errorComponent: PublicProfileErrorPage,
  loader: async ({ context, params }) => {
    if (!context.convexQueryClient) return
    // This query is public. Protected Convex queries intentionally remain
    // client-only until the Better Auth token is wired to the SSR HTTP client.
    await context.queryClient.query({
      ...convexQuery(api.members.publicByHandle, { handle: params.handle }),
      staleTime: "static",
    })
  },
  notFoundComponent: PublicProfileNotFoundPage,
  pendingComponent: PublicProfilePendingPage,
})

function PublicProfilePage() {
  const { handle } = Route.useParams()
  const { data: profile } = useSuspenseQuery(
    convexQuery(api.members.publicByHandle, { handle })
  )
  if (!profile) throw notFound()
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

function PublicProfileErrorPage({ error }: { error: unknown }) {
  const t = defaultTranslate
  return (
    <RouteBoundaryShell width="wide">
      <Alert variant="destructive">
        <AlertTitle>{t("profile.publicNotFoundTitle")}</AlertTitle>
        <AlertDescription>{getErrorMessage(error, t)}</AlertDescription>
      </Alert>
    </RouteBoundaryShell>
  )
}

function PublicProfilePendingPage() {
  return (
    <RouteBoundaryShell width="wide">
      <PublicProfileSkeleton
        label={defaultTranslate("common.loadingPublicProfile")}
      />
    </RouteBoundaryShell>
  )
}

function PublicProfileNotFoundPage() {
  const t = defaultTranslate
  return (
    <RouteBoundaryShell width="wide">
      <Alert>
        <AlertTitle>{t("profile.publicNotFoundTitle")}</AlertTitle>
        <AlertDescription>
          {t("profile.publicNotFoundDescription")}
        </AlertDescription>
      </Alert>
    </RouteBoundaryShell>
  )
}

function defaultTranslate(key: Parameters<typeof formatMessage>[1]) {
  return formatMessage(DEFAULT_LOCALE, key)
}
