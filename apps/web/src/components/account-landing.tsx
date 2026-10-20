import { Navigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Card, CardContent, CardHeader } from "@lyrx/ui/components/card"
import { Skeleton } from "@lyrx/ui/components/skeleton"

import { getSignedInDestination } from "@/lib/account-navigation"
import { useLocale } from "./locale-provider"

export function AccountLanding() {
  const current = useQuery(api.members.current, {})

  if (current === undefined) return <AccountLandingSkeleton />
  const destination = getSignedInDestination(current.state)
  return <Navigate to={destination ?? "/auth/sign-in"} replace />
}

function AccountLandingSkeleton() {
  const { t } = useLocale()
  return (
    <Card aria-label={t("common.loadingAccount")}>
      <CardHeader className="gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </CardContent>
    </Card>
  )
}
