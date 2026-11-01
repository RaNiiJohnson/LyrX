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

// Expo inlines only statically written EXPO_PUBLIC_* accesses.
export const convexUrl = parseConvexUrl(process.env.EXPO_PUBLIC_CONVEX_URL)
