const SUPPORTED =
  /^\/(songs|community|albums|artists|profiles)\/([A-Za-z0-9_-]+)$/

/** Maps a web `href` from public cards to a native route; null when the screen is not built yet. */
export function nativeHref(href: string) {
  const match = SUPPORTED.exec(href)
  return match ? `/${match[1]}/${match[2]}` : null
}

/** Listening links open outside the app and only over HTTPS. */
export function safeExternalUrl(value: string) {
  try {
    return new URL(value).protocol === "https:" ? value : null
  } catch {
    return null
  }
}
