import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { isValidDisplayName, isValidHandle } from "@lyrx/shared"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@lyrx/ui/components/field"
import { Input } from "@lyrx/ui/components/input"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { Spinner } from "@lyrx/ui/components/spinner"
import { toast } from "@lyrx/ui/lib/toast"

import { useAppForm } from "@/lib/app-form"
import { getErrorMessage, localizedUiError } from "@/lib/errors"
import { prepareImageForUpload } from "@/lib/image-upload"
import { useLocale } from "@/app/locale-provider"
import { AccountDeletion } from "@/features/account/account-deletion"

function OptionalLabel() {
  const { t } = useLocale()
  return (
    <span className="text-xs font-normal text-muted-foreground">
      {t("common.optional")}
    </span>
  )
}

export function ProfileEditor() {
  const { t } = useLocale()
  const current = useQuery(api.members.current, {})
  if (current === undefined) return <ProfileEditorSkeleton />
  if (current.state === "suspended") {
    return (
      <div className="flex flex-col gap-6">
        <Alert variant="destructive">
          <AlertTitle>{t("home.suspendedTitle")}</AlertTitle>
          <AlertDescription>
            {t("profile.suspendedDescription")}
          </AlertDescription>
        </Alert>
        <AccountDeletion />
      </div>
    )
  }
  if (current.state !== "ready") {
    return (
      <div className="flex flex-col gap-6">
        <Alert>
          <AlertTitle>{t("profile.unavailableTitle")}</AlertTitle>
          <AlertDescription>
            <Link to="/onboarding">{t("profile.unavailableDescription")}</Link>
          </AlertDescription>
        </Alert>
        {current.state !== "anonymous" ? <AccountDeletion /> : null}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-6">
      <ReadyProfileEditor current={current} />
      <AccountDeletion />
    </div>
  )
}

function ReadyProfileEditor({
  current,
}: {
  current: Extract<
    NonNullable<ReturnType<typeof useQuery<typeof api.members.current>>>,
    { state: "ready" }
  >
}) {
  const { t } = useLocale()
  const updateProfile = useMutation(api.members.updateMyProfile)
  const generateUploadUrl = useMutation(
    api.members.generateProfileImageUploadUrl
  )
  const saveProfileImage = useMutation(api.members.saveProfileImage)
  const [error, setError] = useState<string | null>(null)
  const [imagePending, setImagePending] = useState<"avatar" | "banner" | null>(
    null
  )

  const form = useAppForm({
    defaultValues: {
      handle: current.profile.handle,
      displayName: current.profile.displayName,
      bio: current.profile.bio ?? "",
      presentation: current.artistProfile?.presentation ?? "",
      instagramUrl: current.artistProfile?.instagramUrl ?? "",
      facebookUrl: current.artistProfile?.facebookUrl ?? "",
      tiktokUrl: current.artistProfile?.tiktokUrl ?? "",
      youtubeUrl: current.artistProfile?.youtubeUrl ?? "",
      spotifyUrl: current.artistProfile?.spotifyUrl ?? "",
      customLinks: current.artistProfile?.customLinks ?? [],
    },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        await updateProfile({
          handle: value.handle,
          displayName: value.displayName,
          bio: value.bio || undefined,
          artist:
            current.member.role === "artist"
              ? {
                  presentation: value.presentation || undefined,
                  instagramUrl: value.instagramUrl || undefined,
                  facebookUrl: value.facebookUrl || undefined,
                  tiktokUrl: value.tiktokUrl || undefined,
                  youtubeUrl: value.youtubeUrl || undefined,
                  spotifyUrl: value.spotifyUrl || undefined,
                  customLinks: value.customLinks,
                }
              : undefined,
        })
        toast.success(t("profile.saved"))
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("profile.saveError"), { description: message })
      }
    },
  })

  async function uploadImage(
    kind: "avatar" | "banner",
    file: File | undefined
  ) {
    if (!file) return
    setImagePending(kind)
    setError(null)
    try {
      const optimized = await prepareImageForUpload(file, kind)
      const { uploadIntentId, uploadUrl } = await generateUploadUrl({ kind })
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": optimized.type },
        body: optimized,
      })
      if (!response.ok) {
        throw localizedUiError(t("profile.imageUploadFailed"))
      }
      const payload: unknown = await response.json()
      if (
        !payload ||
        typeof payload !== "object" ||
        !("storageId" in payload) ||
        typeof payload.storageId !== "string"
      ) {
        throw localizedUiError(t("profile.imageInvalidResponse"))
      }
      const result = await saveProfileImage({
        kind,
        storageId: payload.storageId as Id<"_storage">,
        uploadIntentId,
      })
      if (!result.ok) throw localizedUiError(t("error.invalidImage"))
      toast.success(
        kind === "avatar"
          ? t("profile.avatarUpdated")
          : t("profile.bannerUpdated")
      )
    } catch (caught) {
      const message = getErrorMessage(caught, t)
      setError(message)
      toast.error(t("profile.imageError"), { description: message })
    } finally {
      setImagePending(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("navigation.myProfile")}</CardTitle>
        <CardDescription>
          <span className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {current.member.role === "artist"
                ? t("common.artist")
                : t("common.fan")}
            </Badge>
            {current.member.isAdmin ? <Badge>{t("common.admin")}</Badge> : null}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
          className="flex flex-col gap-5"
        >
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{t("profile.saveError")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <FieldSet>
              <FieldLegend>{t("profile.images")}</FieldLegend>
              <Field>
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="avatar">
                    {t("profile.avatar")}
                  </FieldLabel>
                  <OptionalLabel />
                </div>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={imagePending !== null}
                  onChange={(event) =>
                    void uploadImage("avatar", event.target.files?.[0])
                  }
                />
                <FieldDescription>
                  {t("profile.avatarDescription")}
                </FieldDescription>
              </Field>
              {current.member.role === "artist" ? (
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="banner">
                      {t("profile.banner")}
                    </FieldLabel>
                    <OptionalLabel />
                  </div>
                  <Input
                    id="banner"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={imagePending !== null}
                    onChange={(event) =>
                      void uploadImage("banner", event.target.files?.[0])
                    }
                  />
                  <FieldDescription>
                    {t("profile.bannerDescription")}
                  </FieldDescription>
                </Field>
              ) : null}
              {imagePending ? (
                <p className="flex items-center gap-2 text-sm" role="status">
                  <Spinner /> {t("profile.imageUploading")}
                </p>
              ) : null}
            </FieldSet>
            <form.AppField
              name="handle"
              validators={{
                onBlur: ({ value }) =>
                  isValidHandle(value) ? undefined : t("error.invalidHandle"),
              }}
            >
              {(field) => (
                <field.TextField
                  id="handle"
                  label={t("profile.handle")}
                  required
                  minLength={3}
                  maxLength={30}
                />
              )}
            </form.AppField>
            <form.AppField
              name="displayName"
              validators={{
                onBlur: ({ value }) =>
                  isValidDisplayName(value)
                    ? undefined
                    : t("error.invalidDisplayName"),
              }}
            >
              {(field) => (
                <field.TextField
                  id="displayName"
                  label={t("signUp.displayName")}
                  required
                  minLength={2}
                  maxLength={80}
                />
              )}
            </form.AppField>
            <form.AppField name="bio">
              {(field) => (
                <field.TextareaField
                  id="bio"
                  label={t("profile.bio")}
                  labelExtra={<OptionalLabel />}
                  maxLength={500}
                />
              )}
            </form.AppField>
            {current.member.role === "artist" ? (
              <FieldSet>
                <FieldLegend>{t("profile.artistIdentity")}</FieldLegend>
                <form.AppField name="presentation">
                  {(field) => (
                    <field.TextareaField
                      id="presentation"
                      label={t("profile.presentation")}
                      labelExtra={<OptionalLabel />}
                      maxLength={2000}
                    />
                  )}
                </form.AppField>
                {[
                  ["instagramUrl", "instagram", "Instagram"],
                  ["facebookUrl", "facebook", "Facebook"],
                  ["tiktokUrl", "tiktok", "TikTok"],
                  ["youtubeUrl", "youtube", "YouTube"],
                  ["spotifyUrl", "spotify", "Spotify"],
                ].map(([name, id, label]) => (
                  <form.AppField
                    key={name}
                    name={
                      name as
                        | "instagramUrl"
                        | "facebookUrl"
                        | "tiktokUrl"
                        | "youtubeUrl"
                        | "spotifyUrl"
                    }
                  >
                    {(field) => (
                      <field.TextField
                        id={id}
                        label={label}
                        labelExtra={<OptionalLabel />}
                        type="url"
                      />
                    )}
                  </form.AppField>
                ))}
                <form.Field name="customLinks" mode="array">
                  {(linksField) => (
                    <Field>
                      <div className="flex items-center justify-between gap-3">
                        <FieldLabel>{t("profile.customLinks")}</FieldLabel>
                        <OptionalLabel />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={linksField.state.value.length >= 8}
                          onClick={() =>
                            linksField.pushValue({ label: "", url: "" })
                          }
                        >
                          {t("profile.addLink")}
                        </Button>
                      </div>
                      {linksField.state.value.length === 0 ? (
                        <FieldDescription>
                          {t("profile.noCustomLinks")}
                        </FieldDescription>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {linksField.state.value.map((_link, index) => (
                            <div
                              className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
                              key={index}
                            >
                              <form.AppField
                                name={`customLinks[${index}].label`}
                              >
                                {(field) => (
                                  <field.TextField
                                    label={t("profile.customLinkLabel", {
                                      number: index + 1,
                                    })}
                                    labelExtra={null}
                                    maxLength={40}
                                    placeholder={t(
                                      "profile.customLinkPlaceholder"
                                    )}
                                  />
                                )}
                              </form.AppField>
                              <form.AppField name={`customLinks[${index}].url`}>
                                {(field) => (
                                  <field.TextField
                                    label={t("profile.customLinkUrl", {
                                      number: index + 1,
                                    })}
                                    type="url"
                                    placeholder="https://…"
                                  />
                                )}
                              </form.AppField>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                aria-label={t("profile.removeLink", {
                                  number: index + 1,
                                })}
                                onClick={() => linksField.removeValue(index)}
                              >
                                {t("profile.removeLink", {
                                  number: index + 1,
                                })}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </Field>
                  )}
                </form.Field>
              </FieldSet>
            ) : null}
          </FieldGroup>
          <form.AppForm>
            <form.SubmitButton size="lg">{t("profile.save")}</form.SubmitButton>
          </form.AppForm>
        </form>
      </CardContent>
      <CardFooter>
        <Button asChild variant="ghost" size="sm">
          <Link
            to="/profiles/$handle"
            params={{ handle: current.profile.handle }}
          >
            {t("profile.viewPublic")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function ProfileEditorSkeleton() {
  const { t } = useLocale()
  return (
    <Card aria-label={t("common.loadingProfile")}>
      <CardHeader className="gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-5 w-20" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-9 w-36" />
      </CardFooter>
    </Card>
  )
}
