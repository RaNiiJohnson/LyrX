import { useMutation, useQuery } from "convex/react"
import { useState, type FormEvent } from "react"
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
import { Textarea } from "@lyrx/ui/components/textarea"

import { getErrorMessage } from "@/lib/errors"
import { authClient } from "@/lib/auth-client"

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
  const [handle, setHandle] = useState(current.profile.handle)
  const [displayName, setDisplayName] = useState(current.profile.displayName)
  const [bio, setBio] = useState(current.profile.bio ?? "")
  const [presentation, setPresentation] = useState(
    current.artistProfile?.presentation ?? ""
  )
  const [instagramUrl, setInstagramUrl] = useState(
    current.artistProfile?.instagramUrl ?? ""
  )
  const [facebookUrl, setFacebookUrl] = useState(
    current.artistProfile?.facebookUrl ?? ""
  )
  const [tiktokUrl, setTiktokUrl] = useState(
    current.artistProfile?.tiktokUrl ?? ""
  )
  const [youtubeUrl, setYoutubeUrl] = useState(
    current.artistProfile?.youtubeUrl ?? ""
  )
  const [spotifyUrl, setSpotifyUrl] = useState(
    current.artistProfile?.spotifyUrl ?? ""
  )
  const [customLinks, setCustomLinks] = useState(
    current.artistProfile?.customLinks ?? []
  )
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  const [imagePending, setImagePending] = useState<"avatar" | "banner" | null>(
    null
  )
  const [linkPending, setLinkPending] = useState(false)

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      await updateProfile({
        handle,
        displayName,
        bio: bio || undefined,
        artist:
          current.member.role === "artist"
            ? {
                presentation: presentation || undefined,
                instagramUrl: instagramUrl || undefined,
                facebookUrl: facebookUrl || undefined,
                tiktokUrl: tiktokUrl || undefined,
                youtubeUrl: youtubeUrl || undefined,
                spotifyUrl: spotifyUrl || undefined,
                customLinks,
              }
            : undefined,
      })
      setSaved(true)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setPending(false)
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            <Field>
              <FieldLabel htmlFor="handle">Pseudo</FieldLabel>
              <Input
                id="handle"
                required
                minLength={3}
                maxLength={30}
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="displayName">Nom affiché</FieldLabel>
              <Input
                id="displayName"
                required
                minLength={2}
                maxLength={80}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bio">Bio</FieldLabel>
              <Textarea
                id="bio"
                maxLength={500}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </Field>
            {current.member.role === "artist" ? (
              <FieldSet>
                <FieldLegend>Identité artiste</FieldLegend>
                <Field>
                  <FieldLabel htmlFor="presentation">Présentation</FieldLabel>
                  <Textarea
                    id="presentation"
                    maxLength={2000}
                    value={presentation}
                    onChange={(event) => setPresentation(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="instagram">Instagram</FieldLabel>
                  <Input
                    id="instagram"
                    type="url"
                    value={instagramUrl}
                    onChange={(event) => setInstagramUrl(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="facebook">Facebook</FieldLabel>
                  <Input
                    id="facebook"
                    type="url"
                    value={facebookUrl}
                    onChange={(event) => setFacebookUrl(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="tiktok">TikTok</FieldLabel>
                  <Input
                    id="tiktok"
                    type="url"
                    value={tiktokUrl}
                    onChange={(event) => setTiktokUrl(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="youtube">YouTube</FieldLabel>
                  <Input
                    id="youtube"
                    type="url"
                    value={youtubeUrl}
                    onChange={(event) => setYoutubeUrl(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="spotify">Spotify</FieldLabel>
                  <Input
                    id="spotify"
                    type="url"
                    value={spotifyUrl}
                    onChange={(event) => setSpotifyUrl(event.target.value)}
                  />
                </Field>
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel>Liens personnalisés</FieldLabel>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={customLinks.length >= 8}
                      onClick={() =>
                        setCustomLinks((links) => [
                          ...links,
                          { label: "", url: "" },
                        ])
                      }
                    >
                      Ajouter un lien
                    </Button>
                  </div>
                  {customLinks.length === 0 ? (
                    <FieldDescription>
                      Aucun lien personnalisé.
                    </FieldDescription>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {customLinks.map((link, index) => (
                        <div
                          className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
                          key={index}
                        >
                          <Input
                            aria-label={`Libellé du lien ${index + 1}`}
                            maxLength={40}
                            placeholder="Site officiel"
                            value={link.label}
                            onChange={(event) =>
                              setCustomLinks((links) =>
                                links.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, label: event.target.value }
                                    : item
                                )
                              )
                            }
                          />
                          <Input
                            aria-label={`URL du lien ${index + 1}`}
                            type="url"
                            placeholder="https://…"
                            value={link.url}
                            onChange={(event) =>
                              setCustomLinks((links) =>
                                links.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, url: event.target.value }
                                    : item
                                )
                              )
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Supprimer le lien ${index + 1}`}
                            onClick={() =>
                              setCustomLinks((links) =>
                                links.filter(
                                  (_item, itemIndex) => itemIndex !== index
                                )
                              )
                            }
                          >
                            Supprimer
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Field>
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
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Enregistrer
          </Button>
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
