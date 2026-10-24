import { ConvexError } from "convex/values"

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/
const ALLOWED_SOCIAL_HOSTS = {
  facebookUrl: ["facebook.com", "www.facebook.com"],
  instagramUrl: ["instagram.com", "www.instagram.com"],
  spotifyUrl: ["open.spotify.com"],
  tiktokUrl: ["tiktok.com", "www.tiktok.com"],
  youtubeUrl: ["youtube.com", "www.youtube.com", "youtu.be"],
} as const
const IMAGE_RULES = {
  avatar: { maxBytes: 5 * 1024 * 1024, label: "Avatar" },
  banner: { maxBytes: 10 * 1024 * 1024, label: "Banner" },
} as const
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US")
}

export function normalizeHandle(handle: string) {
  return handle.trim().toLocaleLowerCase("en-US")
}

export function validateHandle(handle: string) {
  const normalized = normalizeHandle(handle)
  if (!HANDLE_PATTERN.test(normalized)) {
    throw new ConvexError({
      code: "INVALID_HANDLE",
      message:
        "The handle must contain 3 to 30 characters: lowercase letters, numbers, dots, hyphens or underscores.",
    })
  }
  return normalized
}

export function validateDisplayName(displayName: string) {
  const value = displayName.trim()
  if (value.length < 2 || value.length > 80) {
    throw new ConvexError({
      code: "INVALID_DISPLAY_NAME",
      message: "The display name must contain between 2 and 80 characters.",
    })
  }
  return value
}

export function validateOptionalText(
  value: string | undefined,
  maximumLength: number,
  field: string
) {
  const normalized = value?.trim()
  if (!normalized) return undefined
  if (normalized.length > maximumLength) {
    throw new ConvexError({
      code: "TEXT_TOO_LONG",
      message: `${field} exceeds ${maximumLength} characters.`,
    })
  }
  return normalized
}

export function validateSocialUrl(
  field: keyof typeof ALLOWED_SOCIAL_HOSTS,
  value: string | undefined
) {
  const normalized = value?.trim()
  if (!normalized) return undefined

  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    throw new ConvexError({
      code: "INVALID_URL",
      message: "The social link is not a valid URL.",
    })
  }

  const allowedHosts: ReadonlyArray<string> = ALLOWED_SOCIAL_HOSTS[field]
  if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
    throw new ConvexError({
      code: "INVALID_SOCIAL_URL",
      message: "The link does not match the expected service.",
    })
  }

  return url.toString()
}

export function validateCustomLinks(
  links: Array<{ label: string; url: string }>
) {
  if (links.length > 8) {
    throw new ConvexError({
      code: "TOO_MANY_CUSTOM_LINKS",
      message: "A profile can contain at most 8 custom links.",
    })
  }

  return links.map((link) => {
    const label = link.label.trim()
    if (label.length < 1 || label.length > 40) {
      throw new ConvexError({
        code: "INVALID_LINK_LABEL",
        message: "A link label must contain between 1 and 40 characters.",
      })
    }

    let url: URL
    try {
      url = new URL(link.url.trim())
    } catch {
      throw new ConvexError({
        code: "INVALID_URL",
        message: "A custom link is not a valid URL.",
      })
    }
    if (url.protocol !== "https:") {
      throw new ConvexError({
        code: "INVALID_URL_PROTOCOL",
        message: "Custom links must use HTTPS.",
      })
    }

    return { label, url: url.toString() }
  })
}

export function validateProfileImageMetadata(
  kind: "avatar" | "banner",
  metadata: { contentType?: string; size: number }
) {
  const rule = IMAGE_RULES[kind]
  if (
    !metadata.contentType ||
    !ALLOWED_IMAGE_TYPES.has(metadata.contentType) ||
    metadata.size > rule.maxBytes
  ) {
    return `${rule.label} must be a JPEG, PNG or WebP image no larger than ${rule.maxBytes / 1024 / 1024} MB.`
  }
  return null
}
