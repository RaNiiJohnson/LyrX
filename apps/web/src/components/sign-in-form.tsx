import { useQuery } from "convex/react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import {
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "@lyrx/ui/components/field"
import { Spinner } from "@lyrx/ui/components/spinner"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { toast } from "@lyrx/ui/lib/toast"

import { useAppForm } from "@/lib/app-form"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { AuthCard } from "./auth-card"

export function SignInForm() {
  const capabilities = useQuery(api.configuration.authCapabilities, {})
  const [error, setError] = useState<string | null>(null)
  const [googlePending, setGooglePending] = useState(false)

  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        const result = await authClient.signIn.email({
          email: value.email,
          password: value.password,
          callbackURL: "/onboarding",
        })
        if (result.error) throw result.error
        window.location.assign("/onboarding")
      } catch (caught) {
        const message = getErrorMessage(caught)
        setError(message)
        toast.error("Connexion impossible", { description: message })
      }
    },
  })

  async function signInWithGoogle() {
    if (!capabilities?.google) return
    setGooglePending(true)
    setError(null)
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/onboarding",
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
      title="Connexion"
      description="Retrouvez votre profil Lyr’X et vos outils de contribution."
      error={error}
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
      footer={
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link to="/auth/sign-up" className="text-foreground underline">
            Créer un compte
          </Link>
        </p>
      }
    >
      {capabilities !== undefined && !capabilities.emailDelivery ? (
        <Alert>
          <AlertTitle>Envoi d’emails non configuré</AlertTitle>
          <AlertDescription>
            La connexion reste disponible pour un compte déjà vérifié. Les
            nouveaux emails de vérification et de réinitialisation nécessitent
            encore le fournisseur transactionnel.
          </AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
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
              value.length > 0 ? undefined : "Le mot de passe est requis.",
          }}
        >
          {(field) => (
            <field.TextField
              id="password"
              label="Mot de passe"
              labelExtra={
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-muted-foreground underline"
                >
                  Mot de passe oublié ?
                </Link>
              }
              type="password"
              autoComplete="current-password"
              required
            />
          )}
        </form.AppField>
      </FieldGroup>
      <form.AppForm>
        <form.SubmitButton size="lg">Se connecter</form.SubmitButton>
      </form.AppForm>
      <FieldSeparator>ou</FieldSeparator>
      {capabilities === undefined ? (
        <div className="flex flex-col gap-2" aria-label="Chargement de Google">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isSubmitting || googlePending || !capabilities.google}
                onClick={signInWithGoogle}
              >
                {googlePending ? <Spinner data-icon="inline-start" /> : null}
                Continuer avec Google
              </Button>
            )}
          </form.Subscribe>
          <FieldDescription>
            {capabilities.google
              ? "Google est configuré pour ce déploiement."
              : "Google sera activé lorsque les identifiants OAuth seront configurés."}
          </FieldDescription>
        </>
      )}
    </AuthCard>
  )
}
