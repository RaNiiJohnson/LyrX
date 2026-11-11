import { useState } from "react"
import { Text, View } from "react-native"
import { suggestHandle } from "@lyrx/shared"
import { Button, TextField } from "@/components/form"
import { Eyebrow } from "@/components/ui"
import {
  MAX_CUSTOM_LINKS,
  type ProfileErrors,
  type ProfileValues,
} from "@/lib/profile-form"
import { t } from "@/lib/i18n"
import { fonts, space, useTheme } from "@/lib/theme"

const SOCIAL_FIELDS = [
  { key: "instagramUrl", label: "Instagram" },
  { key: "facebookUrl", label: "Facebook" },
  { key: "tiktokUrl", label: "TikTok" },
  { key: "youtubeUrl", label: "YouTube" },
  { key: "spotifyUrl", label: "Spotify" },
] as const

const url = {
  autoCapitalize: "none",
  autoCorrect: false,
  keyboardType: "url",
  textContentType: "URL",
} as const

/**
 * Identity + artist fields shared by onboarding and the profile editor. The handle
 * follows the display name until the member types their own (onboarding only).
 */
export function ProfileFields({
  values,
  onChange,
  role,
  errors,
  suggestHandleFromName,
}: {
  values: ProfileValues
  onChange: (values: ProfileValues) => void
  role: "artist" | "fan"
  /** Errors are only passed once the member tried to submit. */
  errors: ProfileErrors
  suggestHandleFromName?: boolean
}) {
  const theme = useTheme()
  const [handleEdited, setHandleEdited] = useState(false)
  const patch = (next: Partial<ProfileValues>) =>
    onChange({ ...values, ...next })
  const updateLink = (index: number, next: { label?: string; url?: string }) =>
    patch({
      customLinks: values.customLinks.map((link, position) =>
        position === index ? { ...link, ...next } : link
      ),
    })
  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.md }}>
        <Eyebrow>{t("onboarding.identityTitle")}</Eyebrow>
        <TextField
          label={t("signUp.displayName")}
          hint={t("onboarding.displayNameDescription")}
          error={errors.displayName ? t(errors.displayName) : null}
          value={values.displayName}
          maxLength={60}
          autoComplete="name"
          textContentType="name"
          onChangeText={(displayName) =>
            patch({
              displayName,
              ...(suggestHandleFromName && !handleEdited
                ? { handle: suggestHandle(displayName) }
                : {}),
            })
          }
        />
        <TextField
          label={t("onboarding.handle")}
          hint={t("onboarding.handleDescription")}
          error={errors.handle ? t(errors.handle) : null}
          value={values.handle}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(handle) => {
            setHandleEdited(true)
            patch({ handle })
          }}
        />
        <TextField
          label={t("onboarding.bio")}
          value={values.bio}
          maxLength={500}
          multiline
          onChangeText={(bio) => patch({ bio })}
        />
      </View>
      {role === "artist" ? (
        <>
          <View style={{ gap: space.md }}>
            <Eyebrow>{t("onboarding.artistProfile")}</Eyebrow>
            <TextField
              label={t("onboarding.presentation")}
              value={values.presentation}
              maxLength={2000}
              multiline
              onChangeText={(presentation) => patch({ presentation })}
            />
          </View>
          <View style={{ gap: space.md }}>
            <Eyebrow>{t("profile.socialLinks")}</Eyebrow>
            {SOCIAL_FIELDS.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                placeholder="https://"
                value={values[field.key]}
                onChangeText={(value) => patch({ [field.key]: value })}
                {...url}
              />
            ))}
          </View>
          <View style={{ gap: space.md }}>
            <Eyebrow>{t("profile.customLinks")}</Eyebrow>
            {values.customLinks.length === 0 ? (
              <Text
                style={{
                  color: theme.mutedForeground,
                  fontFamily: fonts.sans,
                  fontSize: 14,
                }}
              >
                {t("profile.noCustomLinks")}
              </Text>
            ) : null}
            {values.customLinks.map((link, index) => (
              <View
                key={index}
                style={{
                  gap: space.sm,
                  padding: space.md,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <TextField
                  label={t("profile.customLinkLabel", { number: index + 1 })}
                  placeholder={t("profile.customLinkPlaceholder")}
                  value={link.label}
                  maxLength={40}
                  onChangeText={(label) => updateLink(index, { label })}
                />
                <TextField
                  label={t("profile.customLinkUrl", { number: index + 1 })}
                  placeholder="https://"
                  value={link.url}
                  onChangeText={(next) => updateLink(index, { url: next })}
                  {...url}
                />
                <Button
                  variant="outline"
                  label={t("profile.removeLink", { number: index + 1 })}
                  onPress={() =>
                    patch({
                      customLinks: values.customLinks.filter(
                        (_, position) => position !== index
                      ),
                    })
                  }
                />
              </View>
            ))}
            <Button
              variant="outline"
              label={t("profile.addLink")}
              disabled={values.customLinks.length >= MAX_CUSTOM_LINKS}
              onPress={() =>
                patch({
                  customLinks: [...values.customLinks, { label: "", url: "" }],
                })
              }
            />
          </View>
        </>
      ) : null}
    </View>
  )
}
