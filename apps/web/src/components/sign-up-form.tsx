import { useQuery } from "convex/react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import { FieldGroup, FieldSeparator } from "@lyrx/ui/components/field"
import { Spinner } from "@lyrx/ui/components/spinner"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { toast } from "@lyrx/ui/lib/toast"

import { useAppForm } from "@/lib/app-form"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { AuthCard } from "./auth-card"

export function SignUpForm() {
  const capabilities = useQuery(api.configuration.authCapabilities, {})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [googlePending, setGooglePending] = useState(false)

  const form = useAppForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      if (!capabilities?.emailDelivery) return
      setError(null)
      setNotice(null)
      try {
        const result = await authClient.signUp.email({
          name: value.name,
          email: value.email,
          password: value.password,
          callbackURL: "/account",
        })
        if (result.error) throw result.error
        setNotice(
          "Consultez votre boîte email et ouvrez le lien de vérification avant de choisir votre rôle."
        )
        toast.success("Compte créé", {
          description: "Consultez votre boîte email pour le vérifier.",
        })
      } catch (caught) {
        const message = getErrorMessage(caught)
        setError(message)
        toast.error("Création du compte impossible", { description: message })
      }
    },
  })

  async function signUpWithGoogle() {
    if (!capabilities?.google) return
    setGooglePending(true)
    setError(null)
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/account",
      })
      if (result.error) throw result.error
    } catch (caught) {
      const message = getErrorMessage(caught)
      setError(message)
      toast.error("Connexion avec Google impossible", { description: message })
      setGooglePending(false)
    }
  }

  return (
    <AuthCard
      title="Créer un compte"
      description="L’inscription est suivie d’une vérification email puis du choix Fan ou Artiste."
      error={error}
      notice={notice}
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
      footer={
        <p className="text-sm text-muted-foreground">
          Déjà membre ?{" "}
          <Link to="/auth/sign-in" className="text-foreground underline">
            Se connecter
          </Link>
        </p>
      }
    >
      {capabilities !== undefined && !capabilities.emailDelivery ? (
        <Alert>
          <AlertTitle>Inscription temporairement indisponible</AlertTitle>
          <AlertDescription>
            Le fournisseur d’email transactionnel n’est pas encore configuré.
            Lyr’X ne crée pas de compte impossible à vérifier.
          </AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <form.AppField
          name="name"
          validators={{
            onBlur: ({ value }) =>
              value.trim().length >= 2
                ? undefined
                : "Le nom doit contenir au moins 2 caractères.",
          }}
        >
          {(field) => (
            <field.TextField
              id="name"
              label="Nom affiché"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
            />
          )}
        </form.AppField>
        <form.AppField
          name="email"
          validators={{
            onBlur: ({ value }) =>
              value.includes("@") ? undefined : "Adresse email invalide.",
          }}
        >
          {(field) => (
            <field.TextField
              id="email"
              label="Adresse email"
              type="email"
              autoComplete="email"
              required
            />
          )}
        </form.AppField>
        <form.AppField
          name="password"
          validators={{
            onBlur: ({ value }) =>
              value.length >= 10
                ? undefined
                : "Le mot de passe doit contenir au moins 10 caractères.",
          }}
        >
          {(field) => (
            <field.TextField
              id="password"
              label="Mot de passe"
              description="10 caractères minimum."
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
          )}
        </form.AppField>
      </FieldGroup>
      <form.AppForm>
        <form.SubmitButton
          size="lg"
          disabled={capabilities?.emailDelivery !== true}
        >
          Créer mon compte
        </form.SubmitButton>
      </form.AppForm>
      <FieldSeparator>ou</FieldSeparator>
      {capabilities === undefined ? (
        <Skeleton className="h-10 w-full" aria-label="Chargement de Google" />
      ) : (
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isSubmitting || googlePending || !capabilities.google}
              onClick={signUpWithGoogle}
            >
              {googlePending ? <Spinner data-icon="inline-start" /> : null}
              Continuer avec Google
            </Button>
          )}
        </form.Subscribe>
      )}
    </AuthCard>
  )
}
