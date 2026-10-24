import compressionWorkerUrl from "browser-image-compression/dist/browser-image-compression.js?url"

export type UploadImageKind = "avatar" | "banner" | "artwork"

// Optimization targets are distinct from the server's upload security limits.
// Preserve aspect ratios and store only the prepared file, not the original.
const IMAGE_POLICIES = {
  avatar: {
    maxInputBytes: 5 * 1024 * 1024,
    targetBytes: 250 * 1024,
    maxDimension: 512,
  },
  banner: {
    maxInputBytes: 10 * 1024 * 1024,
    targetBytes: 750 * 1024,
    maxDimension: 1920,
  },
  artwork: {
    maxInputBytes: 10 * 1024 * 1024,
    targetBytes: 750 * 1024,
    maxDimension: 1600,
  },
} as const
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

class ImagePreparationError extends Error {
  constructor(readonly code: "INVALID_IMAGE" | "IMAGE_OPTIMIZATION_FAILED") {
    super(code)
  }
}

export async function prepareImageForUpload(
  file: File,
  kind: UploadImageKind
): Promise<File> {
  const policy = IMAGE_POLICIES[kind]
  if (
    !ALLOWED_TYPES.has(file.type) ||
    file.size === 0 ||
    file.size > policy.maxInputBytes
  ) {
    throw new ImagePreparationError("INVALID_IMAGE")
  }

  try {
    const { default: imageCompression } =
      await import("browser-image-compression")
    const optimized = await imageCompression(file, {
      maxSizeMB: policy.targetBytes / (1024 * 1024),
      maxWidthOrHeight: policy.maxDimension,
      useWebWorker: true,
      // Bundle the worker library with this app; never load it from a CDN.
      libURL: new URL(compressionWorkerUrl, window.location.href).href,
      fileType: "image/webp",
      initialQuality: 0.85,
      preserveExif: false,
    })
    if (
      !ALLOWED_TYPES.has(optimized.type) ||
      optimized.size === 0 ||
      optimized.size > policy.maxInputBytes
    ) {
      throw new ImagePreparationError("IMAGE_OPTIMIZATION_FAILED")
    }
    // Canvas WebP support varies: use the actual encoder output's MIME/extension.
    const extension =
      optimized.type === "image/webp"
        ? "webp"
        : optimized.type === "image/png"
          ? "png"
          : "jpg"
    const name = file.name.replace(/\.[^.]*$/, "") || "image"
    return new File([optimized], `${name}.${extension}`, {
      type: optimized.type,
      lastModified: file.lastModified,
    })
  } catch {
    // Never silently upload an unprocessed image when decoding/encoding failed.
    throw new ImagePreparationError("IMAGE_OPTIMIZATION_FAILED")
  }
}
