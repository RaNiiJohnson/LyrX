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

export function VerifyEmailForm() {
  const capabilities = useQuery(api.configuration.authCapabilities, {})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      if (!capabilities?.emailDelivery) return
      setError(null)
      try {
        const result = await authClient.sendVerificationEmail({
          email: value.email,
          callbackURL: "/account",
        })
        if (result.error) throw result.error
        setNotice(
          "Si cette adresse correspond à un compte, un nouveau lien a été envoyé."
        )
        toast.success("Nouvel email demandé", {
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
      title="Vérifier votre email"
      description="Ouvrez le lien reçu pour activer les fonctions réservées aux membres."
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
          <AlertTitle>Nouvel envoi indisponible</AlertTitle>
          <AlertDescription>
            Le fournisseur transactionnel n’est pas configuré pour ce
            déploiement.
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
          Renvoyer l’email
        </form.SubmitButton>
      </form.AppForm>
    </AuthCard>
  )
}
