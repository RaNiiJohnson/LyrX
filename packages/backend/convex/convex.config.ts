import { defineApp } from "convex/server"
import { v } from "convex/values"
import aggregate from "@convex-dev/aggregate/convex.config.js"
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js"
import resend from "@convex-dev/resend/convex.config.js"

import betterAuth from "./betterAuth/convex.config"

const app = defineApp({
  env: {
    BETTER_AUTH_SECRET: v.string(),
    EMAIL_FROM: v.optional(v.string()),
    GOOGLE_CLIENT_ID: v.optional(v.string()),
    GOOGLE_CLIENT_SECRET: v.optional(v.string()),
    RESEND_API_KEY: v.optional(v.string()),
    RESEND_WEBHOOK_SECRET: v.string(),
    SITE_URL: v.string(),
  },
})

app.use(betterAuth)
app.use(aggregate, { name: "catalogueSongs" })
app.use(aggregate, { name: "catalogueSongsByStatus" })
app.use(aggregate, { name: "catalogueAlbums" })
app.use(aggregate, { name: "catalogueAlbumsByStatus" })
app.use(aggregate, { name: "catalogueAlbumTracks" })
app.use(aggregate, { name: "publicDiscovery" })
app.use(rateLimiter)
app.use(resend)

export default app
