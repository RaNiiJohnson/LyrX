import { env, query } from "./_generated/server"
import { v } from "convex/values"

export const authCapabilities = query({
  args: {},
  returns: v.object({
    emailDelivery: v.boolean(),
    google: v.boolean(),
  }),
  handler: () => ({
    emailDelivery: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  }),
})
