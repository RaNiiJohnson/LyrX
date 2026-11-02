import type { MessageKey } from "@lyrx/shared"

const AUTH_ERROR_KEYS: Readonly<Record<string, MessageKey>> = {
  INVALID_EMAIL_OR_PASSWORD: "error.invalidCredentials",
  INVALID_PASSWORD: "error.invalidCredentials",
  USER_NOT_FOUND: "error.invalidCredentials",
  EMAIL_NOT_VERIFIED: "error.emailNotVerified",
  USER_ALREADY_EXISTS: "error.accountExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "error.accountExists",
  INVALID_EMAIL: "error.invalidEmail",
  EMAIL_CAN_NOT_BE_SENT: "error.emailUnavailable",
  RATE_LIMITED: "error.rateLimited",
  TOO_MANY_REQUESTS: "error.rateLimited",
}

/** Maps a Better Auth failure (`{ code, status }`) or a thrown network error to a message key. */
export function authErrorKey(error: unknown): MessageKey {
  if (error && typeof error === "object") {
    const { code, status } = error as { code?: unknown; status?: unknown }
    if (typeof code === "string" && AUTH_ERROR_KEYS[code])
      return AUTH_ERROR_KEYS[code]
    if (status === 429) return "error.rateLimited"
    if (typeof status === "number" && status >= 500) return "error.server"
    if (error instanceof TypeError) return "error.network"
  }
  return "error.unexpected"
}
