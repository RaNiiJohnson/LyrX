export const MAX_CATALOGUE_IMAGE_BYTES = 10 * 1024 * 1024

export function isValidCatalogueImageMetadata(
  metadata: {
    _creationTime: number
    contentType?: string
    size: number
  },
  intentCreatedAt: number
) {
  return (
    metadata._creationTime >= intentCreatedAt &&
    ["image/jpeg", "image/png", "image/webp"].includes(
      metadata.contentType ?? ""
    ) &&
    metadata.size <= MAX_CATALOGUE_IMAGE_BYTES
  )
}
