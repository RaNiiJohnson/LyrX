import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useRef, useState } from "react"

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
import {
  useArtworkSelection,
  useCatalogueArtworkUpload,
} from "@/features/catalogue/hooks/use-catalogue-artwork-upload"
import { saveCatalogueDraft } from "@/features/catalogue/lib/save-catalogue-draft"
import { emptyAlbumValues } from "./album-form-options"
import type { AlbumDetail, AlbumFormValues } from "./album-types"

export function useAlbumEditorController({
  albumId,
  detail,
}: {
  albumId?: Id<"albums">
  detail?: AlbumDetail
}) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const createAlbum = useMutation(api.catalogue.albums.createAlbum)
  const updateAlbum = useMutation(api.catalogue.albums.updateAlbum)
  const [error, setError] = useState<string | null>(null)
  const draft = useRef({ id: albumId })
  const artwork = useArtworkSelection()
  const { pending: artworkPending, uploadArtwork } = useCatalogueArtworkUpload(
    albumId ? { kind: "album", id: albumId } : undefined,
    setError
  )
  const defaultValues: AlbumFormValues = detail
    ? {
        title: detail.album.title,
        releaseDate: dateInputFromTimestamp(detail.album.releaseDate),
        description: detail.album.description ?? "",
        primaryLanguage: detail.album.primaryLanguage ?? "",
        genre: detail.album.genre ?? "",
        otherGenre: detail.album.otherGenre ?? "",
        label: detail.album.label ?? "",
        credits: detail.album.credits.join("\n"),
        trackIds: detail.tracks.map(({ song }) => song._id),
      }
    : emptyAlbumValues
  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setError(null)
      const input = {
        title: value.title,
        releaseDate: timestampFromDateInput(value.releaseDate),
        description: value.description || undefined,
        primaryLanguage: value.primaryLanguage || undefined,
        genre: value.genre || undefined,
        otherGenre:
          value.genre === "other" ? value.otherGenre || undefined : undefined,
        label: value.label || undefined,
        credits: namesFromTextarea(value.credits),
      }
      try {
        const saved = await saveCatalogueDraft(
          draft.current,
          (id) =>
            id
              ? updateAlbum({
                  albumId: id,
                  songIds: value.trackIds,
                  ...input,
                }).then(() => id)
              : createAlbum(input),
          artwork.file
            ? (id) => uploadArtwork(artwork.file, { kind: "album", id })
            : undefined
        )
        if (!saved.artworkSaved) {
          setError((message) =>
            `${t("catalogue.artworkSavePartial")} ${message ?? ""}`.trim()
          )
          return
        }
        toast.success(albumId ? t("catalogue.saved") : t("catalogue.created"))
        await navigate({
          to: "/studio/albums/$albumId/preview",
          params: { albumId: saved.id },
        })
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("catalogue.saveError"), { description: message })
      }
    },
  })
  return {
    error,
    form,
    setError,
    artworkPending,
    selectedArtwork: artwork.file,
    artworkPreviewUrl: artwork.previewUrl ?? detail?.artworkUrl,
    selectArtwork: (file: File | undefined) => {
      if (albumId) void uploadArtwork(file)
      else artwork.select(file)
    },
  }
}
