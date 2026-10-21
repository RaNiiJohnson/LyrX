import { useQuery } from "convex/react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { isValidDisplayName } from "@lyrx/shared"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import { FieldGroup, FieldSeparator } from "@lyrx/ui/components/field"
import { Spinner } from "@lyrx/ui/components/spinner"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { toast } from "@lyrx/ui/lib/toast"

import { useAppForm } from "@/lib/app-form"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { AuthCard } from "./auth-card"
import { useLocale } from "./locale-provider"

export function SignUpForm() {
  const { t } = useLocale()
  const capabilities = useQuery(api.configuration.authCapabilities, {})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [googlePending, setGooglePending] = useState(false)

  const form = useAppForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      if (!capabilities?.emailDelivery) return
      setError(null)
      setNotice(null)
      try {
        const result = await authClient.signUp.email({
          name: value.name,
          email: value.email,
          password: value.password,
          callbackURL: "/account",
        })
        if (result.error) throw result.error
        setNotice(t("signUp.notice"))
        toast.success(t("signUp.successTitle"), {
          description: t("signUp.successDescription"),
        })
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("signUp.error"), { description: message })
      }
    },
  })

  async function signUpWithGoogle() {
    if (!capabilities?.google) return
    setGooglePending(true)
    setError(null)
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/account",
      })
      if (result.error) throw result.error
    } catch (caught) {
      const message = getErrorMessage(caught, t)
      setError(message)
      toast.error(t("toast.googleError"), { description: message })
      setGooglePending(false)
    }
  }

  return (
    <AuthCard
      title={t("signUp.title")}
      description={t("signUp.description")}
      error={error}
      notice={notice}
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
      footer={
        <p className="text-sm text-muted-foreground">
          {t("signUp.footerLead")}{" "}
          <Link to="/auth/sign-in" className="text-foreground underline">
            {t("signIn.submit")}
          </Link>
        </p>
      }
    >
      {capabilities !== undefined && !capabilities.emailDelivery ? (
        <Alert>
          <AlertTitle>{t("signUp.emailDeliveryTitle")}</AlertTitle>
          <AlertDescription>
            {t("signUp.emailDeliveryDescription")}
          </AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <form.AppField
          name="name"
          validators={{
            onBlur: ({ value }) =>
              isValidDisplayName(value)
                ? undefined
                : t("error.invalidDisplayName"),
          }}
        >
          {(field) => (
            <field.TextField
              id="name"
              label={t("signUp.displayName")}
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
            />
          )}
        </form.AppField>
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
              label={t("auth.password")}
              description={t("auth.passwordMinimum")}
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
          )}
        </form.AppField>
      </FieldGroup>
      <form.AppForm>
        <form.SubmitButton
          size="lg"
          disabled={capabilities?.emailDelivery !== true}
        >
          {t("signUp.submit")}
        </form.SubmitButton>
      </form.AppForm>
      <FieldSeparator>{t("auth.or")}</FieldSeparator>
      {capabilities === undefined ? (
        <Skeleton
          className="h-10 w-full"
          aria-label={t("auth.googleLoading")}
        />
      ) : (
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isSubmitting || googlePending || !capabilities.google}
              onClick={signUpWithGoogle}
            >
              {googlePending ? <Spinner data-icon="inline-start" /> : null}
              {t("auth.googleContinue")}
            </Button>
          )}
        </form.Subscribe>
      )}
    </AuthCard>
  )
}
