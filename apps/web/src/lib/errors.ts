import type { MessageKey } from "@lyrx/shared"

type Translate = (key: MessageKey) => string

const ERROR_MESSAGE_KEYS: Readonly<Record<string, MessageKey>> = {
  ALBUM_NEEDS_PUBLISHED_TRACK: "error.albumNeedsPublishedTrack",
  ACCOUNT_SUSPENDED: "error.accountSuspended",
  ACCOUNT_UNAVAILABLE: "error.accountUnavailable",
  ADMIN_ALREADY_EXISTS: "error.adminAlreadyExists",
  ELIGIBLE_MEMBER_NOT_FOUND: "error.memberNotEligible",
  SESSION_EXPIRED: "error.sessionExpired",
  INVALID_TOKEN: "error.invalidToken",
  INVALID_EMAIL: "error.invalidEmail",
  PASSWORD_TOO_SHORT: "error.passwordLength",
  PASSWORD_TOO_LONG: "error.passwordLength",
  ARTIST_ROLE_REQUIRED: "error.artistRoleRequired",
  ARTIST_REQUIRED: "error.artistRoleRequired",
  EMAIL_CAN_NOT_BE_SENT: "error.emailUnavailable",
  EMAIL_NOT_VERIFIED: "error.emailNotVerified",
  FORBIDDEN: "error.forbidden",
  FAN_REQUIRED: "community.fanOnly",
  CONTRIBUTION_MODERATED: "community.moderated",
  REVISION_CONFLICT: "community.revisionConflict",
  REPORT_RESOLVED: "community.reportResolved",
  SELF_REPORT_FORBIDDEN: "community.selfReportForbidden",
  RESTORATION_FORBIDDEN: "community.notRestorable",
  HANDLE_TAKEN: "error.handleTaken",
  CATALOGUE_INVARIANT: "error.catalogueUnavailable",
  IMAGE_ALREADY_ATTACHED: "error.invalidImage",
  IMAGE_OPTIMIZATION_FAILED: "error.imageOptimizationFailed",
  INVALID_IMAGE: "error.invalidImage",
  INVALID_INPUT: "error.invalidCatalogue",
  INVALID_LYRICS: "error.invalidLyrics",
  INVALID_TRACKS: "error.invalidTracks",
  INVALID_DISPLAY_NAME: "error.invalidDisplayName",
  INVALID_EMAIL_OR_PASSWORD: "error.invalidCredentials",
  INVALID_HANDLE: "error.invalidHandle",
  INVALID_LINK_LABEL: "error.invalidLinkLabel",
  INVALID_PASSWORD: "error.invalidCredentials",
  INVALID_SOCIAL_URL: "error.invalidSocialUrl",
  INVALID_UPLOAD_INTENT: "error.invalidUploadIntent",
  INVALID_URL: "error.invalidUrl",
  INVALID_URL_PROTOCOL: "error.invalidUrlProtocol",
  ONBOARDING_ALREADY_COMPLETED: "error.onboardingAlreadyCompleted",
  ONBOARDING_REQUIRED: "error.onboardingRequired",
  SHARE_RANGE: "sharing.rangeError",
  NOTEBOOK_NAME: "notebook.nameInvalid",
  NOTEBOOK_LIMIT: "notebook.limit",
  NOTEBOOK_RANGE: "notebook.rangeError",
  NOTEBOOK_SOURCE_CHANGED: "notebook.sourceChanged",
  NOT_FOUND: "error.catalogueNotFound",
  PROFILE_IMAGE_FORBIDDEN: "error.profileImageForbidden",
  PROFILE_INVARIANT_BROKEN: "error.profileUnavailable",
  RATE_LIMITED: "error.rateLimited",
  RATE_LIMIT_EXCEEDED: "error.rateLimited",
  SONG_ALREADY_IN_ALBUM: "error.songAlreadyInAlbum",
  TEXT_TOO_LONG: "error.textTooLong",
  TOO_MANY_CUSTOM_LINKS: "error.tooManyCustomLinks",
  TOO_MANY_REQUESTS: "error.rateLimited",
  UNAUTHENTICATED: "error.unauthenticated",
  UPLOAD_INTENT_MISMATCH: "error.uploadIntentMismatch",
  UPLOAD_NOT_FOUND: "error.uploadNotFound",
  USER_ALREADY_EXISTS: "error.accountExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "error.accountExists",
  USER_NOT_FOUND: "error.invalidCredentials",
}

export class LocalizedUiError extends Error {}

export function localizedUiError(message: string) {
  return new LocalizedUiError(message)
}

export function getErrorMessage(error: unknown, translate?: Translate) {
  if (error instanceof LocalizedUiError) return error.message

  if (translate) {
    const code = getErrorCode(error)
    const key = code ? ERROR_MESSAGE_KEYS[code] : undefined
    if (key) return translate(key)
    const kind = classifyError(error)
    if (kind) return translate(kind)
    // Keep the machine code visible so an unmapped failure stays diagnosable.
    return code?.includes("_")
      ? `${translate("error.unexpected")} (${code})`
      : translate("error.unexpected")
  }

  const message = getRawErrorMessage(error)
  return message ?? "Une erreur inattendue est survenue."
}

/** Failures without an application code: offline, validators, masked server errors. */
function classifyError(error: unknown): MessageKey | undefined {
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    return "error.network"
  const message = getRawErrorMessage(error) ?? ""
  if (error instanceof TypeError && /fetch|network|load failed/i.test(message))
    return "error.network"
  if (
    /ArgumentValidationError|ReturnsValidationError|Validator error/i.test(
      message
    )
  )
    return "error.invalidInput"
  if (/Server Error/i.test(message)) return "error.server"
  return undefined
}

function getErrorCode(
  error: unknown,
  visited: Set<object> = new Set()
): string | undefined {
  if (!error || typeof error !== "object") return undefined
  if (visited.has(error)) return undefined
  visited.add(error)
  const record = error as Record<string, unknown>

  if (typeof record.code === "string") return record.code

  for (const key of ["data", "error", "cause"] as const) {
    if (key in record) {
      const nestedCode = getErrorCode(record[key], visited)
      if (nestedCode) return nestedCode
    }
  }

  const message = getRawErrorMessage(error)
  return message?.match(/\b[A-Z][A-Z0-9_]{2,}\b/)?.[0]
}

function getRawErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }
  return undefined
}
