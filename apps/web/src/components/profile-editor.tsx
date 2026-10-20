import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
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
import { Spinner } from "@lyrx/ui/components/spinner"

import { useAppForm } from "@/lib/app-form"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"

export function ProfileEditor() {
  const current = useQuery(api.members.current, {})
  if (current === undefined) return <Spinner />
  if (current.state === "suspended") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Compte suspendu</AlertTitle>
        <AlertDescription>
          Ce compte ne peut plus modifier ni publier son profil.
        </AlertDescription>
      </Alert>
    )
  }
  if (current.state !== "ready") {
    return (
      <Alert>
        <AlertTitle>Profil indisponible</AlertTitle>
        <AlertDescription>
          <Link to="/onboarding">Terminez l’onboarding</Link> après connexion et
          vérification de votre email.
        </AlertDescription>
      </Alert>
    )
  }
  return <ReadyProfileEditor current={current} />
}

function ReadyProfileEditor({
  current,
}: {
  current: Extract<
    NonNullable<ReturnType<typeof useQuery<typeof api.members.current>>>,
    { state: "ready" }
  >
}) {
  const updateProfile = useMutation(api.members.updateMyProfile)
  const generateUploadUrl = useMutation(
    api.members.generateProfileImageUploadUrl
  )
  const saveProfileImage = useMutation(api.members.saveProfileImage)
  const capabilities = useQuery(api.configuration.authCapabilities, {})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [imagePending, setImagePending] = useState<"avatar" | "banner" | null>(
    null
  )
  const [linkPending, setLinkPending] = useState(false)

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
      setSaved(false)
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
        setSaved(true)
      } catch (caught) {
        setError(getErrorMessage(caught))
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
    setSaved(false)
    try {
      const uploadUrl = await generateUploadUrl({ kind })
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!response.ok) throw new Error("Le transfert de l’image a échoué.")
      const payload: unknown = await response.json()
      if (
        !payload ||
        typeof payload !== "object" ||
        !("storageId" in payload) ||
        typeof payload.storageId !== "string"
      ) {
        throw new Error("La réponse du stockage est invalide.")
      }
      const result = await saveProfileImage({
        kind,
        storageId: payload.storageId as Id<"_storage">,
      })
      if (!result.ok) throw new Error(result.message)
      setSaved(true)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setImagePending(null)
    }
  }

  async function linkGoogleAccount() {
    if (!capabilities?.google) return
    setLinkPending(true)
    setError(null)
    try {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: "/profile",
      })
      if (result.error) throw result.error
    } catch (caught) {
      setError(getErrorMessage(caught))
      setLinkPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mon profil</CardTitle>
        <CardDescription>
          <span className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {current.member.role === "artist" ? "Artiste" : "Fan"}
            </Badge>
            {current.member.isAdmin ? <Badge>Administrateur</Badge> : null}
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
              <AlertTitle>Modification impossible</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {saved ? (
            <Alert>
              <AlertTitle>Profil enregistré</AlertTitle>
            </Alert>
          ) : null}
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Images du profil</FieldLegend>
              <Field>
                <FieldLabel htmlFor="avatar">Avatar</FieldLabel>
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
                  JPEG, PNG ou WebP, 5 Mo maximum.
                </FieldDescription>
              </Field>
              {current.member.role === "artist" ? (
                <Field>
                  <FieldLabel htmlFor="banner">Bannière</FieldLabel>
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
                    JPEG, PNG ou WebP, 10 Mo maximum.
                  </FieldDescription>
                </Field>
              ) : null}
              {imagePending ? (
                <p className="flex items-center gap-2 text-sm" role="status">
                  <Spinner /> Envoi de l’image…
                </p>
              ) : null}
            </FieldSet>
            <form.AppField
              name="handle"
              validators={{
                onBlur: ({ value }) =>
                  /^[a-z0-9._-]{3,30}$/.test(value)
                    ? undefined
                    : "Utilisez 3 à 30 lettres minuscules, chiffres, points, tirets ou underscores.",
              }}
            >
              {(field) => (
                <field.TextField
                  id="handle"
                  label="Pseudo"
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
                  value.trim().length >= 2
                    ? undefined
                    : "Le nom doit contenir au moins 2 caractères.",
              }}
            >
              {(field) => (
                <field.TextField
                  id="displayName"
                  label="Nom affiché"
                  required
                  minLength={2}
                  maxLength={80}
                />
              )}
            </form.AppField>
            <form.AppField name="bio">
              {(field) => (
                <field.TextareaField id="bio" label="Bio" maxLength={500} />
              )}
            </form.AppField>
            {current.member.role === "artist" ? (
              <FieldSet>
                <FieldLegend>Identité artiste</FieldLegend>
                <form.AppField name="presentation">
                  {(field) => (
                    <field.TextareaField
                      id="presentation"
                      label="Présentation"
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
                      <field.TextField id={id} label={label} type="url" />
                    )}
                  </form.AppField>
                ))}
                <form.Field name="customLinks" mode="array">
                  {(linksField) => (
                    <Field>
                      <div className="flex items-center justify-between gap-3">
                        <FieldLabel>Liens personnalisés</FieldLabel>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={linksField.state.value.length >= 8}
                          onClick={() =>
                            linksField.pushValue({ label: "", url: "" })
                          }
                        >
                          Ajouter un lien
                        </Button>
                      </div>
                      {linksField.state.value.length === 0 ? (
                        <FieldDescription>
                          Aucun lien personnalisé.
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
                                    label={`Libellé du lien ${index + 1}`}
                                    labelExtra={null}
                                    maxLength={40}
                                    placeholder="Site officiel"
                                  />
                                )}
                              </form.AppField>
                              <form.AppField name={`customLinks[${index}].url`}>
                                {(field) => (
                                  <field.TextField
                                    label={`URL du lien ${index + 1}`}
                                    type="url"
                                    placeholder="https://…"
                                  />
                                )}
                              </form.AppField>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                aria-label={`Supprimer le lien ${index + 1}`}
                                onClick={() => linksField.removeValue(index)}
                              >
                                Supprimer
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
            <FieldSet>
              <FieldLegend>Compte lié</FieldLegend>
              <Button
                type="button"
                variant="outline"
                disabled={linkPending || !capabilities?.google}
                onClick={linkGoogleAccount}
              >
                {linkPending ? <Spinner data-icon="inline-start" /> : null}
                Lier mon compte Google
              </Button>
              <FieldDescription>
                {capabilities?.google
                  ? "La liaison exige la même adresse email vérifiée."
                  : "La liaison sera disponible après configuration de Google OAuth."}
              </FieldDescription>
            </FieldSet>
          </FieldGroup>
          <form.AppForm>
            <form.SubmitButton size="lg">Enregistrer</form.SubmitButton>
          </form.AppForm>
        </form>
      </CardContent>
      <CardFooter>
        <Button asChild variant="ghost" size="sm">
          <Link
            to="/profiles/$handle"
            params={{ handle: current.profile.handle }}
          >
            Voir le profil public
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
