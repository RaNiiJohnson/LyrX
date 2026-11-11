import { useState } from "react"
import { Image, Text, View } from "react-native"
import { useMutation } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Button } from "@/components/form"
import { Body, Eyebrow, Message } from "@/components/ui"
import { appErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import type { ProfileImageKind } from "@/lib/image-policy"
import {
  InvalidImageError,
  pickProfileImage,
  uploadToStorage,
} from "@/lib/profile-image"
import { fonts, radius, space, useTheme } from "@/lib/theme"

function ImageSlot({
  kind,
  uri,
  initials,
}: {
  kind: ProfileImageKind
  uri?: string | null
  initials: string
}) {
  const theme = useTheme()
  const generateUploadUrl = useMutation(
    api.members.generateProfileImageUploadUrl
  )
  const saveImage = useMutation(api.members.saveProfileImage)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null
  )
  const avatar = kind === "avatar"

  const change = async () => {
    setNotice(null)
    setPending(true)
    try {
      const image = await pickProfileImage(kind)
      if (!image) return
      const { uploadUrl, uploadIntentId } = await generateUploadUrl({ kind })
      const storageId = await uploadToStorage(image, uploadUrl)
      const saved = await saveImage({
        kind,
        storageId: storageId as Id<"_storage">,
        uploadIntentId,
      })
      setNotice(
        saved.ok
          ? {
              ok: true,
              text: t(
                avatar ? "profile.avatarUpdated" : "profile.bannerUpdated"
              ),
            }
          : { ok: false, text: saved.message }
      )
    } catch (caught) {
      const text =
        caught instanceof InvalidImageError
          ? t("error.invalidImage")
          : caught instanceof Error && caught.message === "UPLOAD_FAILED"
            ? t("profile.imageUploadFailed")
            : caught instanceof Error &&
                caught.message === "UPLOAD_INVALID_RESPONSE"
              ? t("profile.imageInvalidResponse")
              : t(appErrorKey(caught))
      setNotice({ ok: false, text })
    } finally {
      setPending(false)
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <Eyebrow>{t(avatar ? "profile.avatar" : "profile.banner")}</Eyebrow>
      <View
        style={{
          flexDirection: avatar ? "row" : "column",
          alignItems: avatar ? "center" : "stretch",
          gap: space.md,
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            accessibilityIgnoresInvertColors
            style={
              avatar
                ? {
                    width: 88,
                    height: 88,
                    borderRadius: radius.pill,
                    backgroundColor: theme.muted,
                  }
                : {
                    width: "100%",
                    aspectRatio: 3,
                    borderRadius: radius.md,
                    backgroundColor: theme.muted,
                  }
            }
          />
        ) : (
          <View
            style={
              avatar
                ? {
                    width: 88,
                    height: 88,
                    borderRadius: radius.pill,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.muted,
                  }
                : {
                    width: "100%",
                    aspectRatio: 3,
                    borderRadius: radius.md,
                    backgroundColor: theme.muted,
                  }
            }
          >
            {avatar ? (
              <Text
                style={{
                  color: theme.mutedForeground,
                  fontFamily: fonts.sansMedium,
                  fontSize: 26,
                }}
              >
                {initials}
              </Text>
            ) : null}
          </View>
        )}
        <View style={{ flex: avatar ? 1 : undefined, gap: space.sm }}>
          <Body muted>
            {t(
              avatar ? "profile.avatarDescription" : "profile.bannerDescription"
            )}
          </Body>
          <Button
            variant="outline"
            label={t(pending ? "profile.imageUploading" : "profile.pickImage")}
            loading={pending}
            onPress={() => void change()}
          />
        </View>
      </View>
      {notice ? (
        <Message
          title={notice.ok ? notice.text : t("profile.imageError")}
          description={notice.ok ? undefined : notice.text}
        />
      ) : null}
    </View>
  )
}

/** Avatar for every member, banner for artists; each uploads as soon as it is picked. */
export function ProfileImages({
  role,
  avatarUrl,
  bannerUrl,
  initials,
}: {
  role: "artist" | "fan"
  avatarUrl?: string | null
  bannerUrl?: string | null
  initials: string
}) {
  return (
    <View style={{ gap: space.lg }}>
      <ImageSlot kind="avatar" uri={avatarUrl} initials={initials} />
      {role === "artist" ? (
        <ImageSlot kind="banner" uri={bannerUrl} initials={initials} />
      ) : null}
    </View>
  )
}
