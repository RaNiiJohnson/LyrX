import { convexQuery } from "@convex-dev/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { DEFAULT_LOCALE, formatMessage } from "@lyrx/shared"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { RouteBoundaryShell } from "@/app/route-boundary-shell"
import {
  PublicProfile,
  PublicProfileSkeleton,
} from "@/features/profile/public-profile"
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
  return (
    <PageShell width="wide">
      <BackendRequired>
        <PublicProfile handle={handle} />
      </BackendRequired>
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
