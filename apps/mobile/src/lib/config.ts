/** Validates the public Convex URL; the app renders a notice instead of simulating a backend. */
export function parseConvexUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.hostname === "127.0.0.1"
      ? url.origin
      : null
  } catch {
    return null
  }
}

/**
 * Better Auth is served by the deployment's HTTP actions host: `*.convex.cloud` maps to
 * `*.convex.site`, and the local backend exposes it on the next port.
 */
export function convexSiteUrl(convexOrigin: string | null): string | null {
  if (!convexOrigin) return null
  const url = new URL(convexOrigin)
  if (url.hostname.endsWith(".convex.cloud"))
    return `https://${url.hostname.replace(/\.convex\.cloud$/, ".convex.site")}`
  if (url.hostname === "127.0.0.1" && url.port)
    return `${url.protocol}//${url.hostname}:${Number(url.port) + 1}`
  return null
}

// Expo inlines only statically written EXPO_PUBLIC_* accesses.
export const convexUrl = parseConvexUrl(process.env.EXPO_PUBLIC_CONVEX_URL)
export const authUrl = convexSiteUrl(convexUrl)
