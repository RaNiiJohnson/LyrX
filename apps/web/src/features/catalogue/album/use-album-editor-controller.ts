import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useState } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { toast } from "@lyrx/ui/lib/toast"

import { useLocale } from "@/app/locale-provider"
import {
  dateInputFromTimestamp,
  namesFromTextarea,
  timestampFromDateInput,
} from "@/features/catalogue/lib/catalogue-form"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"
import { emptyAlbumValues } from "./album-form-options"
import type { AlbumDetail } from "./album-types"

export function useAlbumEditorController({
  albumId,
  detail,
}: {
  albumId?: Id<"albums">
  detail?: AlbumDetail
}) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const createAlbum = useMutation(api.catalogue.createAlbum)
  const updateAlbum = useMutation(api.catalogue.updateAlbum)
  const [error, setError] = useState<string | null>(null)
  const form = useAppForm({
    defaultValues: detail
      ? {
          title: detail.album.title,
          releaseDate: dateInputFromTimestamp(detail.album.releaseDate),
          description: detail.album.description ?? "",
          credits: detail.album.credits.join("\n"),
          trackIds: detail.tracks.map(({ song }) => song._id),
        }
      : emptyAlbumValues,
    onSubmit: async ({ value }) => {
      setError(null)
      const input = {
        title: value.title,
        releaseDate: timestampFromDateInput(value.releaseDate),
        description: value.description || undefined,
        credits: namesFromTextarea(value.credits),
      }
      try {
        const savedAlbumId = albumId
          ? await updateAlbum({
              albumId,
              songIds: value.trackIds,
              ...input,
            }).then(() => albumId)
          : await createAlbum(input)
        toast.success(albumId ? t("catalogue.saved") : t("catalogue.created"))
        await navigate({
          to: "/studio/albums/$albumId/preview",
          params: { albumId: savedAlbumId },
        })
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("catalogue.saveError"), { description: message })
      }
    },
  })
  return { error, form, setError }
}
