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
    ? "Vérifiez votre adresse email Lyr’X"
    : "Réinitialisez votre mot de passe Lyr’X"
  const action = isVerification
    ? "Vérifier mon adresse"
    : "Réinitialiser mon mot de passe"

  await resend.sendEmail(ctx, {
    from: env.EMAIL_FROM ?? "Lyr’X <noreply@hallomada.de>",
    to: input.to,
    subject,
    html: `<p>Bonjour ${escapeHtml(input.name)},</p><p><a href="${escapeHtml(input.url)}">${action}</a></p><p>Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>`,
    text: `Bonjour ${input.name},\n\n${action} : ${input.url}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.`,
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
