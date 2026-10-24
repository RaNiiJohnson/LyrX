import { useMutation } from "convex/react"
import { useEffect, useRef, useState } from "react"

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

  async function uploadArtwork(file: File | undefined, target = resource) {
    if (!target || !file) return false
    setPending(true)
    setError(null)
    try {
      const optimized = await prepareImageForUpload(file, "artwork")
      const { uploadUrl, intentId } = await generateUploadUrl({
        resource: target,
      })
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
      await registerArtworkUpload({ resource: target, intentId, storageId })
      await saveArtwork({ resource: target, intentId, storageId })
      toast.success(t("catalogue.artworkUpdated"))
      return true
    } catch (caught) {
      const message = getErrorMessage(caught, t)
      setError(message)
      toast.error(t("catalogue.uploadError"), { description: message })
      return false
    } finally {
      setPending(false)
    }
  }

  return { pending, uploadArtwork }
}

// New entries cannot request an owner-bound upload intent until they have an id.
// Keep the chosen image local, and release its preview URL on replacement/unmount.
export function useArtworkSelection() {
  const currentUrl = useRef<string | undefined>(undefined)
  const [selection, setSelection] = useState<{
    file: File
    previewUrl: string
  }>()
  useEffect(
    () => () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current)
    },
    []
  )

  function select(file: File | undefined) {
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current)
    currentUrl.current = file ? URL.createObjectURL(file) : undefined
    setSelection(
      file && currentUrl.current
        ? { file, previewUrl: currentUrl.current }
        : undefined
    )
  }

  return { file: selection?.file, previewUrl: selection?.previewUrl, select }
}
