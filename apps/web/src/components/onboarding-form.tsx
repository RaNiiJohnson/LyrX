import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@lyrx/ui/components/field"
import { Spinner } from "@lyrx/ui/components/spinner"
import { ToggleGroup, ToggleGroupItem } from "@lyrx/ui/components/toggle-group"

import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"

type AccountRole = "artist" | "fan"

export function OnboardingForm() {
  const current = useQuery(api.members.current, {})
  const completeOnboarding = useMutation(api.members.completeOnboarding)
  const [error, setError] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: {
      role: "fan" as AccountRole,
      handle: "",
      displayName: "",
      bio: "",
      presentation: "",
      instagramUrl: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        await completeOnboarding({
          role: value.role,
          handle: value.handle,
          displayName: value.displayName,
          bio: value.bio || undefined,
          artist:
            value.role === "artist"
              ? {
                  presentation: value.presentation || undefined,
                  instagramUrl: value.instagramUrl || undefined,
                  customLinks: [],
                }
              : undefined,
        })
        window.location.assign("/profile")
      } catch (caught) {
        setError(getErrorMessage(caught))
      }
    },
  })

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
              <AlertTitle>Profil non créé</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Rôle du compte</FieldLegend>
              <form.Field name="role">
                {(field) => (
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value === "artist" || value === "fan") {
                        field.handleChange(value)
                      }
                    }}
                    onBlur={field.handleBlur}
                    aria-label="Rôle du compte"
                  >
                    <ToggleGroupItem value="fan">Fan</ToggleGroupItem>
                    <ToggleGroupItem value="artist">Artiste</ToggleGroupItem>
                  </ToggleGroup>
                )}
              </form.Field>
              <FieldDescription>
                Un artiste peut publier son propre contenu dès les lots
                catalogue. Un fan peut proposer du contenu à la modération.
              </FieldDescription>
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
                  label="Pseudo public"
                  description="Lettres minuscules, chiffres, point, tiret ou underscore."
                  required
                  minLength={3}
                  maxLength={30}
                  placeholder="rija.music"
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
            <form.Subscribe selector={(state) => state.values.role}>
              {(role) =>
                role === "artist" ? (
                  <FieldSet>
                    <FieldLegend>Profil artiste</FieldLegend>
                    <form.AppField name="presentation">
                      {(field) => (
                        <field.TextareaField
                          id="presentation"
                          label="Présentation"
                          maxLength={2000}
                        />
                      )}
                    </form.AppField>
                    <form.AppField name="instagramUrl">
                      {(field) => (
                        <field.TextField
                          id="instagram"
                          label="Instagram"
                          type="url"
                          placeholder="https://instagram.com/..."
                        />
                      )}
                    </form.AppField>
                  </FieldSet>
                ) : null
              }
            </form.Subscribe>
          </FieldGroup>
          <form.AppForm>
            <form.SubmitButton size="lg">Créer mon profil</form.SubmitButton>
          </form.AppForm>
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
