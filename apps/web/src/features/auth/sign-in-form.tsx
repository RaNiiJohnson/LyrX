import { useQuery } from "convex/react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import {
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "@lyrx/ui/components/field"
import { Spinner } from "@lyrx/ui/components/spinner"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { toast } from "@lyrx/ui/lib/toast"

import { useAppForm } from "@/lib/app-form"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { AuthCard } from "./auth-card"
import { useLocale } from "@/app/locale-provider"

export function SignInForm() {
  const { t } = useLocale()
  const capabilities = useQuery(api.configuration.authCapabilities, {})
  const [error, setError] = useState<string | null>(null)
  const [googlePending, setGooglePending] = useState(false)

  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        const result = await authClient.signIn.email({
          email: value.email,
          password: value.password,
          callbackURL: "/account",
        })
        if (result.error) throw result.error
        window.location.assign("/account")
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("signIn.error"), { description: message })
      }
    },
  })

  async function signInWithGoogle() {
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
      title={t("signIn.title")}
      description={t("signIn.description")}
      error={error}
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
      footer={
        <p className="text-sm text-muted-foreground">
          {t("signIn.footerLead")}{" "}
          <Link to="/auth/sign-up" className="text-foreground underline">
            {t("navigation.createAccount")}
          </Link>
        </p>
      }
    >
      {capabilities !== undefined && !capabilities.emailDelivery ? (
        <Alert>
          <AlertTitle>{t("auth.emailUnavailableTitle")}</AlertTitle>
          <AlertDescription>
            {t("auth.emailUnavailableDescription")}
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
        <form.AppField
          name="password"
          validators={{
            onBlur: ({ value }) =>
              value.length > 0 ? undefined : t("auth.passwordRequired"),
          }}
        >
          {(field) => (
            <field.TextField
              id="password"
              label={t("auth.password")}
              labelExtra={
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-muted-foreground underline"
                >
                  {t("signIn.forgotPassword")}
                </Link>
              }
              type="password"
              autoComplete="current-password"
              required
            />
          )}
        </form.AppField>
      </FieldGroup>
      <form.AppForm>
        <form.SubmitButton size="lg">{t("signIn.submit")}</form.SubmitButton>
      </form.AppForm>
      <FieldSeparator>{t("auth.or")}</FieldSeparator>
      {capabilities === undefined ? (
        <div
          className="flex flex-col gap-2"
          aria-label={t("auth.googleLoading")}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isSubmitting || googlePending || !capabilities.google}
                onClick={signInWithGoogle}
              >
                {googlePending ? <Spinner data-icon="inline-start" /> : null}
                {t("auth.googleContinue")}
              </Button>
            )}
          </form.Subscribe>
          <FieldDescription>
            {capabilities.google
              ? t("auth.googleConfigured")
              : t("auth.googlePendingConfiguration")}
          </FieldDescription>
        </>
      )}
    </AuthCard>
  )
}
