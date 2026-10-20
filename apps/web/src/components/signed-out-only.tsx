import { Navigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import type { ReactNode } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@lyrx/ui/components/card"
import { Skeleton } from "@lyrx/ui/components/skeleton"

import { getSignedInDestination } from "@/lib/account-navigation"

export function SignedOutOnly({ children }: { children: ReactNode }) {
  const current = useQuery(api.members.current, {})

  if (current === undefined) return <SignedOutOnlySkeleton />
  const destination = getSignedInDestination(current.state)
  if (destination) return <Navigate to={destination} replace />
  return children
}

function SignedOutOnlySkeleton() {
  return (
    <Card aria-label="Chargement du compte">
      <CardHeader className="gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-4/5" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-4 w-48" />
      </CardFooter>
    </Card>
  )
}
