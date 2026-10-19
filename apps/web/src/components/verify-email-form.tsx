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

export function VerifyEmailForm() {
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
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/onboarding",
      })
      if (result.error) throw result.error
      setNotice(
        "Si cette adresse correspond à un compte, un nouveau lien a été envoyé."
      )
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthCard
      title="Vérifier votre email"
      description="Ouvrez le lien reçu pour activer les fonctions réservées aux membres."
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
          <AlertTitle>Nouvel envoi indisponible</AlertTitle>
          <AlertDescription>
            Le fournisseur transactionnel n’est pas configuré pour ce
            déploiement.
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
        Renvoyer l’email
      </Button>
    </AuthCard>
  )
}
