import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { FieldGroup } from "@lyrx/ui/components/field"

import { useAppForm } from "@/lib/app-form"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { AuthCard } from "./auth-card"

export function ResetPasswordForm({ token }: { token?: string }) {
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: {
      password: "",
      confirmation: "",
    },
    onSubmit: async ({ value }) => {
      if (!token) return
      if (value.password !== value.confirmation) {
        setError("Les deux mots de passe ne correspondent pas.")
        return
      }
      setError(null)
      try {
        const result = await authClient.resetPassword({
          newPassword: value.password,
          token,
        })
        if (result.error) throw result.error
        setNotice("Le mot de passe a été modifié. Vous pouvez vous connecter.")
      } catch (caught) {
        setError(getErrorMessage(caught))
      }
    },
  })

  return (
    <AuthCard
      title="Nouveau mot de passe"
      description="Le changement révoque les autres sessions du compte."
      error={error}
      notice={notice}
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
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
              label="Nouveau mot de passe"
              description="10 caractères minimum."
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
          )}
        </form.AppField>
        <form.AppField name="confirmation">
          {(field) => (
            <field.TextField
              id="confirmation"
              label="Confirmer"
              type="password"
              autoComplete="new-password"
              required
            />
          )}
        </form.AppField>
      </FieldGroup>
      <form.AppForm>
        <form.SubmitButton size="lg" disabled={!token}>
          Enregistrer le mot de passe
        </form.SubmitButton>
      </form.AppForm>
    </AuthCard>
  )
}
