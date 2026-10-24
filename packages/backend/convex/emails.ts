import { Resend } from "@convex-dev/resend"

import { components } from "./_generated/api"
import type { ActionCtx } from "./_generated/server"
import { env } from "./_generated/server"

type AuthEmailKind = "password-reset" | "verification"

export const resend = new Resend(components.resend, {
  testMode: false,
})

export async function sendAuthEmail(
  ctx: ActionCtx,
  input: {
    kind: AuthEmailKind
    name: string
    to: string
    url: string
  }
) {
  if (!env.RESEND_API_KEY) {
    throw new Error(
      "EMAIL_DELIVERY_NOT_CONFIGURED: configure RESEND_API_KEY in the Convex deployment"
    )
  }

  const isVerification = input.kind === "verification"
  const subject = isVerification
    ? "Verify your Lyr’X email address"
    : "Reset your Lyr’X password"
  const action = isVerification ? "Verify my email" : "Reset my password"

  await resend.sendEmail(ctx, {
    from: env.EMAIL_FROM ?? "Lyr’X <noreply@hallomada.de>",
    to: input.to,
    subject,
    html: `<p>Hello ${escapeHtml(input.name)},</p><p><a href="${escapeHtml(input.url)}">${action}</a></p><p>If you did not request this, ignore this message.</p>`,
    text: `Hello ${input.name},\n\n${action} : ${input.url}\n\nIf you did not request this, ignore this message.`,
  })
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      })[character] ?? character
  )
}
