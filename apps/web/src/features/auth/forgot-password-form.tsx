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
import { useLocale } from "@/app/locale-provider"

export function ForgotPasswordForm() {
  const { t } = useLocale()
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
        setNotice(t("forgot.notice"))
        toast.success(t("forgot.successTitle"), {
          description: t("forgot.successDescription"),
        })
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("toast.sendError"), { description: message })
      }
    },
  })

  return (
    <AuthCard
      title={t("forgot.title")}
      description={t("forgot.description")}
      error={error}
      notice={notice}
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
      footer={
        <Link to="/auth/sign-in" className="text-sm underline">
          {t("forgot.footer")}
        </Link>
      }
    >
      {capabilities !== undefined && !capabilities.emailDelivery ? (
        <Alert>
          <AlertTitle>{t("forgot.deliveryUnavailableTitle")}</AlertTitle>
          <AlertDescription>
            {t("forgot.deliveryUnavailableDescription")}
          </AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <form.AppField
          name="email"
          validators={{
            onBlur: ({ value }) =>
              value.includes("@") ? undefined : t("auth.emailInvalid"),
          }}
        >
          {(field) => (
            <field.TextField
              id="email"
              label={t("auth.email")}
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
          {t("forgot.submit")}
        </form.SubmitButton>
      </form.AppForm>
    </AuthCard>
  )
}
