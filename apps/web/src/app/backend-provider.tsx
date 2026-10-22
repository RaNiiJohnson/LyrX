import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import type { ConvexReactClient } from "convex/react"
import type { ReactNode } from "react"

import { providerAuthClient } from "@/lib/auth-client"

export function BackendProvider({
  children,
  client,
  initialToken,
}: {
  children: ReactNode
  client: ConvexReactClient | null
  initialToken?: string | null
}) {
  if (!client) return children

  return (
    <ConvexBetterAuthProvider
      client={client}
      authClient={providerAuthClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  )
}
