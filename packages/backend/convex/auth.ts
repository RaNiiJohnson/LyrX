import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { requireActionCtx } from "@convex-dev/better-auth/utils"
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal"

import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import { env } from "./_generated/server"
import authConfig from "./auth.config"
import authSchema from "./betterAuth/schema"
import { sendAuthEmail } from "./emails"

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  { local: { schema: authSchema } }
)

export function createAuthOptions(ctx: GenericCtx<DataModel>) {
  const googleConfigured = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
  )

  return {
    appName: "Lyr'X",
    baseURL: env.SITE_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.SITE_URL],
    database: authComponent.adapter(ctx),
    account: {
      accountLinking: {
        enabled: true,
        requireLocalEmailVerified: true,
        trustedProviders: ["google"],
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 10,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail(requireActionCtx(ctx), {
          kind: "password-reset",
          name: user.name,
          to: user.email,
          url,
        })
      },
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignUp: true,
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail(requireActionCtx(ctx), {
          kind: "verification",
          name: user.name,
          to: user.email,
          url,
        })
      },
    },
    socialProviders: googleConfigured
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : {},
    plugins: [convex({ authConfig })],
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
  } satisfies BetterAuthOptions
}

export function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth(createAuthOptions(ctx))
}

export const { getAuthUser } = authComponent.clientApi()
