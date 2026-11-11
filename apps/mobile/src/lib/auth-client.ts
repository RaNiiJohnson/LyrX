import { expoClient } from "@better-auth/expo/client"
import { convexClient } from "@convex-dev/better-auth/client/plugins"
import type { AuthClient } from "@convex-dev/better-auth/react"
import { createAuthClient } from "better-auth/react"
import * as SecureStore from "expo-secure-store"
import { authUrl } from "@/lib/config"

/** Deep link the verification email returns to once the address is confirmed. */
export const VERIFIED_CALLBACK = "lyrx://account"

// Session cookies live in the OS keystore via SecureStore, never in plain storage.
export const authClient = createAuthClient({
  baseURL: authUrl ?? undefined,
  plugins: [
    expoClient({
      scheme: "lyrx",
      storagePrefix: "lyrx",
      storage: SecureStore,
    }),
    convexClient(),
  ],
})

/** Same single compatibility cast as the web client (@convex-dev/better-auth#420). */
export const providerAuthClient = authClient as unknown as AuthClient
