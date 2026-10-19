import { useQuery } from "convex/react"
import { useState, type FormEvent } from "react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@lyrx/ui/components/field"
import { Input } from "@lyrx/ui/components/input"
import { Spinner } from "@lyrx/ui/components/spinner"

import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { AuthCard } from "./auth-card"

export function SignInForm() {
  const capabilities = useQuery(api.configuration.authCapabilities, {})
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/onboarding",
      })
      if (result.error) throw result.error
      window.location.assign("/onboarding")
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function signInWithGoogle() {
    if (!capabilities?.google) return
    setPending(true)
    setError(null)
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/onboarding",
      })
      if (result.error) throw result.error
    } catch (caught) {
      setError(getErrorMessage(caught))
      setPending(false)
    }
  }

  return (
    <AuthCard
      title="Connexion"
      description="Retrouvez votre profil Lyr’X et vos outils de contribution."
      error={error}
      onSubmit={handleSubmit}
      footer={
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link to="/auth/sign-up" className="text-foreground underline">
            Créer un compte
          </Link>
        </p>
      }
    >
      {!capabilities?.emailDelivery ? (
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
        <Field>
          <FieldLabel htmlFor="email">Adresse email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
            <Link
              to="/auth/forgot-password"
              className="text-sm text-muted-foreground underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={pending} size="lg">
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Se connecter
      </Button>
      <FieldSeparator>ou</FieldSeparator>
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={pending || !capabilities?.google}
        onClick={signInWithGoogle}
      >
        Continuer avec Google
      </Button>
      <FieldDescription>
        {capabilities?.google
          ? "Google est configuré pour ce déploiement."
          : "Google sera activé lorsque les identifiants OAuth seront configurés."}
      </FieldDescription>
    </AuthCard>
  )
}
