import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ConvexReactClient } from "convex/react"
import type { ReactNode } from "react"

import { providerAuthClient } from "@/lib/auth-client"
import { getPublicRuntimeConfig } from "@/lib/runtime-config"

const runtimeConfig = getPublicRuntimeConfig()
const convexClient = runtimeConfig
  ? new ConvexReactClient(runtimeConfig.convexUrl)
  : null

export function BackendProvider({
  children,
  initialToken,
}: {
  children: ReactNode
  initialToken?: string | null
}) {
  if (!convexClient) return children

  return (
    <ConvexBetterAuthProvider
      client={convexClient}
      authClient={providerAuthClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  )
}
