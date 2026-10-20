import { httpRouter } from "convex/server"

import { authComponent, createAuth } from "./auth"
import { resend } from "./emails"
import { httpAction } from "./_generated/server"

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await resend.handleResendEventWebhook(ctx, request)
  }),
})

export default http
