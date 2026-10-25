import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config"
import type { AuthConfig } from "convex/server"

export const authProvider = getAuthConfigProvider()

export default {
  providers: [authProvider],
} satisfies AuthConfig
