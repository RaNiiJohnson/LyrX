import { convexClient } from "@convex-dev/better-auth/client/plugins"
import type { AuthClient } from "@convex-dev/better-auth/react"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  plugins: [convexClient()],
})

/**
 * Compatibility boundary for @convex-dev/better-auth 0.12.5 with patched
 * Better Auth 1.6.x. The provider's exported generic currently resolves
 * useSession().data to never even though the runtime client contract matches.
 * Keep this single unknown cast until the published Convex adapter fixes #420.
 */
export const providerAuthClient = authClient as unknown as AuthClient
