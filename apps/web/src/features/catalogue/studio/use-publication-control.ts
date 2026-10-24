import { useMutation } from "convex/react"
import { useState } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { toast } from "@lyrx/ui/lib/toast"

import { useLocale } from "@/app/locale-provider"
import { getErrorMessage } from "@/lib/errors"

type PublicationResource =
  { kind: "song"; id: Id<"songs"> } | { kind: "album"; id: Id<"albums"> }

export function usePublicationControl(
  resource: PublicationResource,
  status: "draft" | "published"
) {
  const { t } = useLocale()
  const publishSong = useMutation(api.catalogue.publishSong)
  const unpublishSong = useMutation(api.catalogue.unpublishSong)
  const publishAlbum = useMutation(api.catalogue.publishAlbum)
  const unpublishAlbum = useMutation(api.catalogue.unpublishAlbum)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function changeStatus() {
    setPending(true)
    setError(null)
    try {
      if (resource.kind === "song") {
        if (status === "draft") await publishSong({ songId: resource.id })
        else await unpublishSong({ songId: resource.id })
      } else if (status === "draft")
        await publishAlbum({ albumId: resource.id })
      else await unpublishAlbum({ albumId: resource.id })
      toast.success(
        status === "draft"
          ? t("catalogue.publishedNotice")
          : t("catalogue.unpublishedNotice")
      )
    } catch (caught) {
      const message = getErrorMessage(caught, t)
      setError(message)
      toast.error(t("catalogue.saveError"), { description: message })
    } finally {
      setPending(false)
    }
  }

  return { changeStatus, error, pending }
}
