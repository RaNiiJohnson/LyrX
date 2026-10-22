import { convexQuery } from "@convex-dev/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { BackendRequired } from "@/app/backend-required"
import { useLocale } from "@/app/locale-provider"
import { PageShell } from "@/app/page-shell"
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
    await context.queryClient.ensureQueryData(
      convexQuery(api.members.publicByHandle, { handle: params.handle })
    )
  },
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
  const { t } = useLocale()
  return (
    <PageShell width="wide">
      <Alert variant="destructive">
        <AlertTitle>{t("profile.publicNotFoundTitle")}</AlertTitle>
        <AlertDescription>{getErrorMessage(error, t)}</AlertDescription>
      </Alert>
    </PageShell>
  )
}

function PublicProfilePendingPage() {
  return (
    <PageShell width="wide">
      <PublicProfileSkeleton />
    </PageShell>
  )
}
