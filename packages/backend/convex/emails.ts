import type { ActionCtx } from "./_generated/server"
import { env } from "./_generated/server"

type AuthEmailKind = "password-reset" | "verification"

export async function sendAuthEmail(
  _ctx: ActionCtx,
  input: {
    kind: AuthEmailKind
    name: string
    to: string
    url: string
  }
) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error(
      "EMAIL_DELIVERY_NOT_CONFIGURED: configure RESEND_API_KEY and EMAIL_FROM in the Convex deployment"
    )
  }

  const isVerification = input.kind === "verification"
  const subject = isVerification
    ? "Vérifiez votre adresse email Lyr’X"
    : "Réinitialisez votre mot de passe Lyr’X"
  const action = isVerification
    ? "Vérifier mon adresse"
    : "Réinitialiser mon mot de passe"

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject,
      html: `<p>Bonjour ${escapeHtml(input.name)},</p><p><a href="${escapeHtml(input.url)}">${action}</a></p><p>Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>`,
      text: `Bonjour ${input.name},\n\n${action} : ${input.url}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.`,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`EMAIL_DELIVERY_FAILED (${response.status}): ${details}`)
  }
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
