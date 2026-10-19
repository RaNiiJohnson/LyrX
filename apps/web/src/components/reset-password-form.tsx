import { useState, type FormEvent } from "react"
import { Link } from "@tanstack/react-router"

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

export function ResetPasswordForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.")
      return
    }
    setPending(true)
    setError(null)
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (result.error) throw result.error
      setNotice("Le mot de passe a été modifié. Vous pouvez vous connecter.")
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthCard
      title="Nouveau mot de passe"
      description="Le changement révoque les autres sessions du compte."
      error={error}
      notice={notice}
      onSubmit={handleSubmit}
      footer={
        <Link to="/auth/sign-in" className="text-sm underline">
          Aller à la connexion
        </Link>
      }
    >
      {!token ? (
        <Alert variant="destructive">
          <AlertTitle>Lien incomplet</AlertTitle>
          <AlertDescription>
            Le jeton de réinitialisation est absent. Demandez un nouveau lien.
          </AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="password">Nouveau mot de passe</FieldLabel>
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
        <Field>
          <FieldLabel htmlFor="confirmation">Confirmer</FieldLabel>
          <Input
            id="confirmation"
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" disabled={pending || !token}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Enregistrer le mot de passe
      </Button>
    </AuthCard>
  )
}
