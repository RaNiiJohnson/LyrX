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

const APP_ERROR_KEYS: Readonly<Record<string, MessageKey>> = {
  ACCOUNT_SUSPENDED: "error.accountSuspended",
  ARTIST_ROLE_REQUIRED: "error.artistRoleRequired",
  HANDLE_TAKEN: "error.handleTaken",
  INVALID_DISPLAY_NAME: "error.invalidDisplayName",
  INVALID_HANDLE: "error.invalidHandle",
  INVALID_IMAGE: "error.invalidImage",
  IMAGE_ALREADY_ATTACHED: "error.invalidImage",
  INVALID_LINK_LABEL: "error.invalidLinkLabel",
  INVALID_SOCIAL_URL: "error.invalidSocialUrl",
  INVALID_UPLOAD_INTENT: "error.invalidUploadIntent",
  INVALID_URL: "error.invalidUrl",
  INVALID_URL_PROTOCOL: "error.invalidUrlProtocol",
  ONBOARDING_ALREADY_COMPLETED: "error.onboardingAlreadyCompleted",
  ONBOARDING_REQUIRED: "error.onboardingRequired",
  PROFILE_IMAGE_FORBIDDEN: "error.profileImageForbidden",
  PROFILE_INVARIANT_BROKEN: "error.profileUnavailable",
  RATE_LIMITED: "error.rateLimited",
  RATE_LIMIT_EXCEEDED: "error.rateLimited",
  TEXT_TOO_LONG: "error.textTooLong",
  TOO_MANY_CUSTOM_LINKS: "error.tooManyCustomLinks",
  UNAUTHENTICATED: "error.unauthenticated",
  UPLOAD_INTENT_MISMATCH: "error.uploadIntentMismatch",
  UPLOAD_NOT_FOUND: "error.uploadNotFound",
  EMAIL_NOT_VERIFIED: "error.emailNotVerified",
}

function nestedCode(error: unknown, depth = 0): string | undefined {
  if (!error || typeof error !== "object" || depth > 3) return undefined
  const record = error as Record<string, unknown>
  if (typeof record.code === "string") return record.code
  for (const key of ["data", "error", "cause"] as const)
    if (key in record) {
      const found = nestedCode(record[key], depth + 1)
      if (found) return found
    }
  return undefined
}

/** Maps a Convex `ConvexError` (code in `data`) or a network failure to a message key. */
export function appErrorKey(error: unknown): MessageKey {
  const code = nestedCode(error)
  if (code && APP_ERROR_KEYS[code]) return APP_ERROR_KEYS[code]
  return authErrorKey(error)
}
