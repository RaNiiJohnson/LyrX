import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useState } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Doc, Id } from "@lyrx/backend/convex/_generated/dataModel"
import { toast } from "@lyrx/ui/lib/toast"

import { useLocale } from "@/app/locale-provider"
import {
  emptySongValues,
  toSongMutationInput,
} from "@/features/catalogue/lib/catalogue-form"
import { songValuesFromDetail } from "@/features/catalogue/lib/song-values"
import { getErrorMessage } from "@/lib/errors"
import { useAppForm } from "@/lib/app-form"
import type { SongDetail } from "./song-types"

export function useSongEditorController({
  detail,
  initialAlbum,
  primaryArtist,
  returnAlbumId,
  songId,
}: {
  detail?: SongDetail
  initialAlbum?: Doc<"albums">
  primaryArtist: string
  returnAlbumId?: Id<"albums">
  songId?: Id<"songs">
}) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const createSong = useMutation(api.catalogue.songs.createSong)
  const updateSong = useMutation(api.catalogue.songs.updateSong)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const form = useAppForm({
    defaultValues: detail
      ? songValuesFromDetail(detail)
      : emptySongValues(primaryArtist, initialAlbum),
    onSubmit: async ({ value }) => {
      setError(null)
      if (value.releaseType === "album" && !value.albumId) {
        setError(t("studio.chooseAlbum"))
        document.getElementById("albumId")?.focus()
        return
      }
      const requiredFields: Array<[string, string, string]> = [
        ["title", value.title, t("studio.songTitle")],
        ["primaryArtist", value.primaryArtist, t("studio.primaryArtist")],
        ["lyricsText", value.lyricsText, t("studio.lyricsEditor")],
      ]
      const missing = requiredFields.find(
        ([, fieldValue]) => !fieldValue.trim()
      )
      if (missing) {
        setError(t("studio.requiredField", { field: missing[2] }))
        document.getElementById(missing[0])?.focus()
        return
      }
      setSaving(true)
      try {
        const input = toSongMutationInput(value)
        const savedSongId = songId
          ? await updateSong({ songId, ...input }).then(() => songId)
          : await createSong(input)
        toast.success(songId ? t("catalogue.saved") : t("catalogue.created"))
        await navigate({
          to: "/studio/songs/$songId/preview",
          params: { songId: savedSongId },
          search: { fromAlbumId: returnAlbumId },
        })
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("catalogue.saveError"), { description: message })
      } finally {
        setSaving(false)
      }
    },
  })

  return {
    error,
    form,
    saving,
    setError,
  }
}
