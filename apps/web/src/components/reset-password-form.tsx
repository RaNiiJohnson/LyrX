import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { FieldGroup } from "@lyrx/ui/components/field"
import { toast } from "@lyrx/ui/lib/toast"

import { useAppForm } from "@/lib/app-form"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { AuthCard } from "./auth-card"
import { useLocale } from "./locale-provider"

export function ResetPasswordForm({ token }: { token?: string }) {
  const { t } = useLocale()
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
        const message = t("reset.mismatch")
        setError(message)
        toast.error(t("reset.updateError"), { description: message })
        return
      }
      setError(null)
      try {
        const result = await authClient.resetPassword({
          newPassword: value.password,
          token,
        })
        if (result.error) throw result.error
        setNotice(t("reset.notice"))
        toast.success(t("reset.success"))
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("reset.updateError"), { description: message })
      }
    },
  })

  return (
    <AuthCard
      title={t("reset.title")}
      description={t("reset.description")}
      error={error}
      notice={notice}
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
      footer={
        <Link to="/auth/sign-in" className="text-sm underline">
          {t("reset.footer")}
        </Link>
      }
    >
      {!token ? (
        <Alert variant="destructive">
          <AlertTitle>{t("reset.incompleteTitle")}</AlertTitle>
          <AlertDescription>
            {t("reset.incompleteDescription")}
          </AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <form.AppField
          name="password"
          validators={{
            onBlur: ({ value }) =>
              value.length >= 10 ? undefined : t("auth.passwordTooShort"),
          }}
        >
          {(field) => (
            <field.TextField
              id="password"
              label={t("reset.newPassword")}
              description={t("auth.passwordMinimum")}
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
              label={t("reset.confirm")}
              type="password"
              autoComplete="new-password"
              required
            />
          )}
        </form.AppField>
      </FieldGroup>
      <form.AppForm>
        <form.SubmitButton size="lg" disabled={!token}>
          {t("reset.submit")}
        </form.SubmitButton>
      </form.AppForm>
    </AuthCard>
  )
}
