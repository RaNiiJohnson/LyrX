import { useQuery } from "convex/react"
import { useState, type FormEvent } from "react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@lyrx/ui/components/field"
import { Input } from "@lyrx/ui/components/input"
import { Spinner } from "@lyrx/ui/components/spinner"

import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { AuthCard } from "./auth-card"

export function ForgotPasswordForm() {
  const capabilities = useQuery(api.configuration.authCapabilities, {})
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!capabilities?.emailDelivery) return
    setPending(true)
    setError(null)
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
      })
      if (result.error) throw result.error
      setNotice(
        "Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé."
      )
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Recevez un lien à usage limité pour choisir un nouveau mot de passe."
      error={error}
      notice={notice}
      onSubmit={handleSubmit}
      footer={
        <Link to="/auth/sign-in" className="text-sm underline">
          Revenir à la connexion
        </Link>
      }
    >
      {!capabilities?.emailDelivery ? (
        <Alert>
          <AlertTitle>Envoi indisponible</AlertTitle>
          <AlertDescription>
            Le fournisseur d’email doit être configuré avant d’utiliser ce
            parcours.
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
      </FieldGroup>
      <Button
        type="submit"
        size="lg"
        disabled={pending || !capabilities?.emailDelivery}
      >
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Envoyer le lien
      </Button>
    </AuthCard>
  )
}
