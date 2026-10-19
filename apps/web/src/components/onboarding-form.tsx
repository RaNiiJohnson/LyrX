import { useMutation, useQuery } from "convex/react"
import { useState, type FormEvent } from "react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
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
import { ToggleGroup, ToggleGroupItem } from "@lyrx/ui/components/toggle-group"

import { getErrorMessage } from "@/lib/errors"

type AccountRole = "artist" | "fan"

export function OnboardingForm() {
  const current = useQuery(api.members.current, {})
  const completeOnboarding = useMutation(api.members.completeOnboarding)
  const [role, setRole] = useState<AccountRole>("fan")
  const [handle, setHandle] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [presentation, setPresentation] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (current === undefined) return <Spinner />
  if (current.state === "anonymous") {
    return (
      <Alert>
        <AlertTitle>Connexion nécessaire</AlertTitle>
        <AlertDescription>
          <Link to="/auth/sign-in">Connectez-vous</Link> avant de choisir votre
          rôle.
        </AlertDescription>
      </Alert>
    )
  }
  if (current.state === "email-unverified") {
    return (
      <Alert>
        <AlertTitle>Email non vérifié</AlertTitle>
        <AlertDescription>
          Vérifiez {current.email ?? "votre adresse"}, puis rechargez cette
          page. Vous pouvez aussi demander un nouvel email depuis la page de
          vérification.
        </AlertDescription>
      </Alert>
    )
  }
  if (current.state === "ready") {
    return (
      <Alert>
        <AlertTitle>Profil déjà créé</AlertTitle>
        <AlertDescription>
          Votre rôle est {current.member.role === "artist" ? "Artiste" : "Fan"}.{" "}
          <Link to="/profile">Modifier mon profil</Link>
        </AlertDescription>
      </Alert>
    )
  }
  if (current.state === "suspended") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Compte suspendu</AlertTitle>
        <AlertDescription>
          Ce compte ne peut pas créer ou modifier de profil.
        </AlertDescription>
      </Alert>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await completeOnboarding({
        role,
        handle,
        displayName,
        bio: bio || undefined,
        artist:
          role === "artist"
            ? {
                presentation: presentation || undefined,
                instagramUrl: instagramUrl || undefined,
                customLinks: [],
              }
            : undefined,
      })
      window.location.assign("/profile")
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choisissez votre rôle</CardTitle>
        <CardDescription>
          Le rôle organise votre expérience. Il ne donne ni badge vérifié ni
          propriété sur une page artiste existante.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Profil non créé</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Rôle du compte</FieldLegend>
              <ToggleGroup
                type="single"
                variant="outline"
                value={role}
                onValueChange={(value) => {
                  if (value === "artist" || value === "fan") setRole(value)
                }}
                aria-label="Rôle du compte"
              >
                <ToggleGroupItem value="fan">Fan</ToggleGroupItem>
                <ToggleGroupItem value="artist">Artiste</ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>
                Un artiste peut publier son propre contenu dès les lots
                catalogue. Un fan peut proposer du contenu à la modération.
              </FieldDescription>
            </FieldSet>
            <Field>
              <FieldLabel htmlFor="handle">Pseudo public</FieldLabel>
              <Input
                id="handle"
                required
                minLength={3}
                maxLength={30}
                placeholder="rija.music"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
              />
              <FieldDescription>
                Lettres minuscules, chiffres, point, tiret ou underscore.
              </FieldDescription>
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
            {role === "artist" ? (
              <FieldSet>
                <FieldLegend>Profil artiste</FieldLegend>
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
                    placeholder="https://instagram.com/..."
                    value={instagramUrl}
                    onChange={(event) => setInstagramUrl(event.target.value)}
                  />
                </Field>
              </FieldSet>
            ) : null}
          </FieldGroup>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Créer mon profil
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          L’administration reste un droit distinct attribué uniquement côté
          serveur.
        </p>
      </CardFooter>
    </Card>
  )
}
