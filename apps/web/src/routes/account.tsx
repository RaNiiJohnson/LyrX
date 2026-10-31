import { createFileRoute, Navigate } from "@tanstack/react-router"

import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { AccountLandingSkeleton } from "@/features/account/account-landing"
import { api } from "@lyrx/backend/convex/_generated/api"
import { useQuery } from "convex/react"
import { getSignedInDestination } from "@/lib/account-navigation"

export const Route = createFileRoute("/account")({
  ...appRouteBoundaries,
  component: AccountPage,
})

function AccountPage() {
  const current = useQuery(api.members.current, {})
  const destination = current ? getSignedInDestination(current.state) : null
  return (
    <PageShell>
      {current === undefined ? (
        <AccountLandingSkeleton />
      ) : (
        <Navigate to={destination ?? "/auth/sign-in"} replace />
      )}
    </PageShell>
  )
}
