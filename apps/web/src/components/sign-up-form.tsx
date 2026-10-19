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
} from "@lyrx/ui/components/field"
import { Input } from "@lyrx/ui/components/input"
import { Spinner } from "@lyrx/ui/components/spinner"

import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { AuthCard } from "./auth-card"

export function SignUpForm() {
  const capabilities = useQuery(api.configuration.authCapabilities, {})
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!capabilities?.emailDelivery) return
    setPending(true)
    setError(null)
    setNotice(null)
    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: "/onboarding",
      })
      if (result.error) throw result.error
      setNotice(
        "Consultez votre boîte email et ouvrez le lien de vérification avant de choisir votre rôle."
      )
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthCard
      title="Créer un compte"
      description="L’inscription est suivie d’une vérification email puis du choix Fan ou Artiste."
      error={error}
      notice={notice}
      onSubmit={handleSubmit}
      footer={
        <p className="text-sm text-muted-foreground">
          Déjà membre ?{" "}
          <Link to="/auth/sign-in" className="text-foreground underline">
            Se connecter
          </Link>
        </p>
      }
    >
      {!capabilities?.emailDelivery ? (
        <Alert>
          <AlertTitle>Inscription temporairement indisponible</AlertTitle>
          <AlertDescription>
            Le fournisseur d’email transactionnel n’est pas encore configuré.
            Lyr’X ne crée pas de compte impossible à vérifier.
          </AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nom affiché</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
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
          <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FieldDescription>10 caractères minimum.</FieldDescription>
        </Field>
      </FieldGroup>
      <Button
        type="submit"
        size="lg"
        disabled={pending || !capabilities?.emailDelivery}
      >
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Créer mon compte
      </Button>
    </AuthCard>
  )
}
