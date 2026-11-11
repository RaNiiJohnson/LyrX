import { useState } from "react"
import { View } from "react-native"
import { useMutation } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Button } from "@/components/form"
import { Body, Cover, Eyebrow, Message } from "@/components/ui"
import { appErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import {
  InvalidImageError,
  pickImage,
  uploadToStorage,
} from "@/lib/profile-image"
import { space } from "@/lib/theme"

export type ArtworkResource =
  { kind: "song"; id: Id<"songs"> } | { kind: "album"; id: Id<"albums"> }

/**
 * Artwork picker for a saved song or album. The server needs four steps (authorise, upload,
 * register, save); saving the artwork moves a published item back to draft, as on the web.
 */
export function ArtworkField({
  resource,
  uri,
  label,
}: {
  resource: ArtworkResource
  uri: string | null
  label: string
}) {
  const generate = useMutation(api.catalogue.artwork.generateArtworkUploadUrl)
  const register = useMutation(api.catalogue.artwork.registerArtworkUpload)
  const save = useMutation(api.catalogue.artwork.saveArtwork)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const change = async () => {
    setError(null)
    setPending(true)
    try {
      const image = await pickImage("artwork")
      if (!image) return
      const { uploadUrl, intentId } = await generate({ resource })
      const storageId = (await uploadToStorage(
        image,
        uploadUrl
      )) as Id<"_storage">
      await register({ resource, intentId, storageId })
      await save({ resource, intentId, storageId })
    } catch (caught) {
      setError(
        caught instanceof InvalidImageError
          ? t("error.invalidImage")
          : caught instanceof Error && caught.message.startsWith("UPLOAD_")
            ? t("profile.imageUploadFailed")
            : t(appErrorKey(caught))
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <Eyebrow>{t("catalogue.artwork")}</Eyebrow>
      <View
        style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}
      >
        <Cover uri={uri} label={label} size={96} />
        <View style={{ flex: 1, gap: space.sm }}>
          <Body muted>{t("catalogue.artworkDescription")}</Body>
          <Button
            variant="outline"
            loading={pending}
            label={uri ? t("catalogue.editArtwork") : t("catalogue.addArtwork")}
            onPress={() => void change()}
          />
        </View>
      </View>
      {error ? <Message title={t("error.title")} description={error} /> : null}
    </View>
  )
}
