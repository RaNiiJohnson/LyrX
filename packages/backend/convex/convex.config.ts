import { defineApp } from "convex/server"
import { v } from "convex/values"
import resend from "@convex-dev/resend/convex.config.js"

import betterAuth from "./betterAuth/convex.config"

const app = defineApp({
  env: {
    BETTER_AUTH_SECRET: v.string(),
    EMAIL_FROM: v.optional(v.string()),
    GOOGLE_CLIENT_ID: v.optional(v.string()),
    GOOGLE_CLIENT_SECRET: v.optional(v.string()),
    RESEND_API_KEY: v.optional(v.string()),
    SITE_URL: v.string(),
  },
})

app.use(betterAuth)
app.use(resend)

export default app
