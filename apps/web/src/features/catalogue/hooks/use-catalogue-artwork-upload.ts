import { useMutation } from "convex/react"
import { useState } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { toast } from "@lyrx/ui/lib/toast"

import { getErrorMessage, localizedUiError } from "@/lib/errors"
import { prepareImageForUpload } from "@/lib/image-upload"
import { useLocale } from "@/app/locale-provider"

type ArtworkResource =
  { kind: "song"; id: Id<"songs"> } | { kind: "album"; id: Id<"albums"> }

export function useCatalogueArtworkUpload(
  resource: ArtworkResource | undefined,
  setError: (message: string | null) => void
) {
  const { t } = useLocale()
  const generateUploadUrl = useMutation(
    api.catalogue.artwork.generateArtworkUploadUrl
  )
  const registerArtworkUpload = useMutation(
    api.catalogue.artwork.registerArtworkUpload
  )
  const saveArtwork = useMutation(api.catalogue.artwork.saveArtwork)
  const [pending, setPending] = useState(false)

  async function uploadArtwork(file: File | undefined) {
    if (!resource || !file) return
    setPending(true)
    setError(null)
    try {
      const optimized = await prepareImageForUpload(file, "artwork")
      const { uploadUrl, intentId } = await generateUploadUrl({ resource })
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": optimized.type },
        body: optimized,
      })
      if (!response.ok) throw localizedUiError(t("catalogue.uploadError"))
      const payload: unknown = await response.json()
      if (
        !payload ||
        typeof payload !== "object" ||
        !("storageId" in payload) ||
        typeof payload.storageId !== "string"
      ) {
        throw localizedUiError(t("profile.imageInvalidResponse"))
      }
      const storageId = payload.storageId as Id<"_storage">
      await registerArtworkUpload({ resource, intentId, storageId })
      await saveArtwork({ resource, intentId, storageId })
      toast.success(t("catalogue.artworkUpdated"))
    } catch (caught) {
      const message = getErrorMessage(caught, t)
      setError(message)
      toast.error(t("catalogue.uploadError"), { description: message })
    } finally {
      setPending(false)
    }
  }

  return { pending, uploadArtwork }
}
