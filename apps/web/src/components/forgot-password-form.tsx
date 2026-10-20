import { useQuery } from "convex/react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { FieldGroup } from "@lyrx/ui/components/field"
import { toast } from "@lyrx/ui/lib/toast"

import { useAppForm } from "@/lib/app-form"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { AuthCard } from "./auth-card"

export function ForgotPasswordForm() {
  const capabilities = useQuery(api.configuration.authCapabilities, {})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      if (!capabilities?.emailDelivery) return
      setError(null)
      try {
        const result = await authClient.requestPasswordReset({
          email: value.email,
          redirectTo: "/auth/reset-password",
        })
        if (result.error) throw result.error
        setNotice(
          "Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé."
        )
        toast.success("Demande envoyée", {
          description: "Consultez votre boîte email.",
        })
      } catch (caught) {
        const message = getErrorMessage(caught)
        setError(message)
        toast.error("Envoi impossible", { description: message })
      }
    },
  })

  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Recevez un lien à usage limité pour choisir un nouveau mot de passe."
      error={error}
      notice={notice}
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
      footer={
        <Link to="/auth/sign-in" className="text-sm underline">
          Revenir à la connexion
        </Link>
      }
    >
      {capabilities !== undefined && !capabilities.emailDelivery ? (
        <Alert>
          <AlertTitle>Envoi indisponible</AlertTitle>
          <AlertDescription>
            Le fournisseur d’email doit être configuré avant d’utiliser ce
            parcours.
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
      </FieldGroup>
      <form.AppForm>
        <form.SubmitButton
          size="lg"
          disabled={capabilities?.emailDelivery !== true}
        >
          Envoyer le lien
        </form.SubmitButton>
      </form.AppForm>
    </AuthCard>
  )
}
