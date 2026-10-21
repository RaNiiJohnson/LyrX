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
import { useLocale } from "./locale-provider"

export function VerifyEmailForm() {
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
        const result = await authClient.sendVerificationEmail({
          email: value.email,
          callbackURL: "/account",
        })
        if (result.error) throw result.error
        setNotice(t("verify.notice"))
        toast.success(t("verify.successTitle"), {
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
      title={t("verify.title")}
      description={t("verify.description")}
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
          <AlertTitle>{t("verify.deliveryUnavailableTitle")}</AlertTitle>
          <AlertDescription>
            {t("verify.deliveryUnavailableDescription")}
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
          {t("verify.submit")}
        </form.SubmitButton>
      </form.AppForm>
    </AuthCard>
  )
}
