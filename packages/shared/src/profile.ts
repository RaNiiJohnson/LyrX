const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/

export function isValidHandle(value: string) {
  return HANDLE_PATTERN.test(value.trim().toLocaleLowerCase("en-US"))
}

export function isValidDisplayName(value: string) {
  const length = value.trim().length
  return length >= 2 && length <= 80
}

/**
 * Proposes a valid public handle from a display name ("Rija Rasolo" →
 * "rija.rasolo"). Returns an empty string when nothing usable remains.
 */
export function suggestHandle(displayName: string) {
  const handle = displayName
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/([._-])[._-]+/g, "$1")
    .slice(0, 30)
    .replace(/^[._-]+|[._-]+$/g, "")
  return isValidHandle(handle) ? handle : ""
}
