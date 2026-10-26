import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight, ImagePlus, UserRound } from "lucide-react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { isValidDisplayName, isValidHandle } from "@lyrx/shared"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@lyrx/ui/components/avatar"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@lyrx/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@lyrx/ui/components/field"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { Separator } from "@lyrx/ui/components/separator"
import { Spinner } from "@lyrx/ui/components/spinner"
import { toast } from "@lyrx/ui/lib/toast"

import { useAppForm } from "@/lib/app-form"
import { getErrorMessage, localizedUiError } from "@/lib/errors"
import { prepareImageForUpload } from "@/lib/image-upload"
import { ImageUploadField } from "@/lib/image-upload-field"
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
  const [leaving, setLeaving] = useState(false)
  const current = useQuery(api.members.current, {})
  // Keep the deletion controller mounted while auth revocation invalidates the
  // profile. Only the form region changes until the full navigation completes.
  if (leaving) {
    return (
      <div className="flex flex-col gap-6">
        <ProfileEditorSkeleton />
        <AccountDeletion onPendingChange={setLeaving} />
      </div>
    )
  }
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
        <AccountDeletion onPendingChange={setLeaving} />
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
        {current.state !== "anonymous" ? (
          <AccountDeletion onPendingChange={setLeaving} />
        ) : null}
      </div>
    )
  }
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <ReadyProfileEditor current={current} />
      <AccountDeletion onPendingChange={setLeaving} />
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
  const publicProfile = useQuery(api.members.publicByHandle, {
    handle: current.profile.handle,
  })
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
    <section className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("navigation.myProfile")}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {current.member.role === "artist"
                ? t("common.artist")
                : t("common.fan")}
            </Badge>
            {current.member.isAdmin ? <Badge>{t("common.admin")}</Badge> : null}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link
            to="/profiles/$handle"
            params={{ handle: current.profile.handle }}
          >
            {t("profile.viewPublic")}
            <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
        className="flex min-w-0 flex-col gap-8"
      >
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t("profile.saveError")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <FieldGroup className="gap-8">
          <FieldSet>
            <FieldLegend>{t("profile.images")}</FieldLegend>
            <FieldDescription>
              {t("profile.imagesDescription")}
            </FieldDescription>
            <FieldGroup className="grid gap-6 sm:grid-cols-2">
              <ImageUploadField
                id="avatar"
                label={t("profile.avatar")}
                description={t("profile.avatarDescription")}
                pending={imagePending !== null}
                currentImage={Boolean(publicProfile?.avatarUrl)}
                onSelect={(file) => void uploadImage("avatar", file)}
                preview={
                  <span className="block size-24 shrink-0">
                    {publicProfile === undefined ? (
                      <Skeleton className="size-24 rounded-full" />
                    ) : (
                      <Avatar className="size-24 shrink-0">
                        <AvatarImage
                          src={publicProfile?.avatarUrl ?? undefined}
                          alt={current.profile.displayName}
                        />
                        <AvatarFallback>
                          <UserRound aria-hidden="true" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </span>
                }
              />
              {current.member.role === "artist" ? (
                <ImageUploadField
                  id="banner"
                  label={t("profile.banner")}
                  description={t("profile.bannerDescription")}
                  pending={imagePending !== null}
                  currentImage={Boolean(publicProfile?.artist?.bannerUrl)}
                  onSelect={(file) => void uploadImage("banner", file)}
                  preview={
                    <span className="block h-24 w-40 shrink-0">
                      <ProfileBannerPreview
                        key={publicProfile?.artist?.bannerUrl ?? "empty"}
                        url={publicProfile?.artist?.bannerUrl}
                        loading={publicProfile === undefined}
                      />
                    </span>
                  }
                />
              ) : null}
            </FieldGroup>
            {imagePending ? (
              <p className="flex items-center gap-2 text-sm" role="status">
                <Spinner /> {t("profile.imageUploading")}
              </p>
            ) : null}
          </FieldSet>
          <Separator />
          <FieldSet>
            <FieldLegend>{t("profile.identity")}</FieldLegend>
            <FieldGroup className="grid gap-5 sm:grid-cols-2">
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
            </FieldGroup>
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
          </FieldSet>
          {current.member.role === "artist" ? (
            <>
              <Separator />
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
              </FieldSet>
              <Separator />
              <FieldSet>
                <FieldLegend>{t("profile.socialLinks")}</FieldLegend>
                <FieldGroup className="grid gap-5 sm:grid-cols-2">
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
                </FieldGroup>
              </FieldSet>
              <Separator />
              <FieldSet>
                <FieldLegend>{t("profile.customLinks")}</FieldLegend>
                <form.Field name="customLinks" mode="array">
                  {(linksField) => (
                    <Field>
                      <div className="flex items-center justify-between gap-3">
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
                        <FieldGroup className="gap-3">
                          {linksField.state.value.map((_link, index) => (
                            <FieldGroup
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
                            </FieldGroup>
                          ))}
                        </FieldGroup>
                      )}
                    </Field>
                  )}
                </form.Field>
              </FieldSet>
            </>
          ) : null}
        </FieldGroup>
        <Separator />
        <div className="flex flex-wrap items-center justify-end gap-4">
          <form.AppForm>
            <form.SubmitButton size="lg">{t("profile.save")}</form.SubmitButton>
          </form.AppForm>
        </div>
      </form>
    </section>
  )
}

function ProfileBannerPreview({
  url,
  loading,
}: {
  url?: string | null
  loading: boolean
}) {
  const { t } = useLocale()
  const [failed, setFailed] = useState(false)
  if (loading) return <Skeleton className="h-24 w-full" />
  return url && !failed ? (
    <img
      src={url}
      alt={t("profile.banner")}
      className="h-24 w-full rounded-xl object-cover"
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className="grid h-24 place-items-center rounded-xl bg-muted text-muted-foreground"
      aria-hidden="true"
    >
      <ImagePlus className="size-8" />
    </div>
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
