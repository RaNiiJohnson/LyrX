import type { MessageKey } from "@lyrx/shared"

type Translate = (key: MessageKey) => string

const ERROR_MESSAGE_KEYS: Readonly<Record<string, MessageKey>> = {
  ALBUM_NEEDS_PUBLISHED_TRACK: "error.albumNeedsPublishedTrack",
  ACCOUNT_SUSPENDED: "error.accountSuspended",
  ARTIST_ROLE_REQUIRED: "error.artistRoleRequired",
  EMAIL_CAN_NOT_BE_SENT: "error.emailUnavailable",
  EMAIL_NOT_VERIFIED: "error.emailNotVerified",
  FORBIDDEN: "error.forbidden",
  HANDLE_TAKEN: "error.handleTaken",
  CATALOGUE_INVARIANT: "error.catalogueUnavailable",
  IMAGE_ALREADY_ATTACHED: "error.invalidImage",
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
    return translate(key ?? "error.unexpected")
  }

  const message = getRawErrorMessage(error)
  return message ?? "Une erreur inattendue est survenue."
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
