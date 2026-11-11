export type ProfileImageKind = "avatar" | "banner"

/** Optimisation targets; the server enforces its own, looser upload limits. */
export const IMAGE_POLICIES = {
  avatar: { maxInputBytes: 5 * 1024 * 1024, maxDimension: 512, quality: 0.85 },
  banner: {
    maxInputBytes: 10 * 1024 * 1024,
    maxDimension: 1920,
    quality: 0.85,
  },
} as const

export type Dimensions = { width: number; height: number }

/** Resize action that keeps the aspect ratio and never upscales; `null` = already small. */
export function resizeFor(kind: ProfileImageKind, size: Dimensions) {
  const longest = Math.max(size.width, size.height)
  const { maxDimension } = IMAGE_POLICIES[kind]
  if (longest <= maxDimension) return null
  return size.width >= size.height
    ? { width: maxDimension }
    : { height: maxDimension }
}

/** The picker reports `fileSize` only on some platforms; reject only what is known to be too big. */
export function acceptableInput(
  kind: ProfileImageKind,
  fileSize: number | undefined | null
) {
  return (
    fileSize === undefined ||
    fileSize === null ||
    (fileSize > 0 && fileSize <= IMAGE_POLICIES[kind].maxInputBytes)
  )
}
