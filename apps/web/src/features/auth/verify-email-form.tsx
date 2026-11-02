import { useQuery } from "convex/react"
import { useEffect, useState } from "react"
import { Link, Navigate } from "@tanstack/react-router"
import { MailCheck } from "lucide-react"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { FieldGroup } from "@lyrx/ui/components/field"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { Spinner } from "@lyrx/ui/components/spinner"
import { toast } from "@lyrx/ui/lib/toast"

import { getSignedInDestination } from "@/lib/account-navigation"
import { useAppForm } from "@/lib/app-form"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { AuthCard } from "./auth-card"
import { useLocale } from "@/app/locale-provider"

const RESEND_COOLDOWN_SECONDS = 60

/**
 * Entry point for unverified accounts. With a known address (just signed up,
 * or signed in without verification) it shows a "check your inbox" page;
 * otherwise it falls back to a form that requests a new link.
 */
export function VerifyEmailForm({ email }: { email?: string }) {
  const current = useQuery(api.members.current, {})
  if (current === undefined) return <VerifyEmailSkeleton />
  if (current.state !== "anonymous" && current.state !== "email-unverified") {
    // The link was already opened: continue to onboarding or the profile.
    return (
      <Navigate to={getSignedInDestination(current.state) ?? "/"} replace />
    )
  }
  const knownEmail =
    current.state === "email-unverified" ? (current.email ?? email) : email
  if (knownEmail) {
    return (
      <CheckInbox
        email={knownEmail}
        signedIn={current.state === "email-unverified"}
        // A link was just sent by the sign-up request itself.
        initialCooldown={
          current.state === "anonymous" ? RESEND_COOLDOWN_SECONDS : 0
        }
      />
    )
  }
  return <ResendVerificationForm />
}

function useResendVerification() {
  const { t } = useLocale()
  const capabilities = useQuery(api.configuration.authCapabilities, {})
  async function resend(email: string) {
    if (!capabilities?.emailDelivery) return false
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/account",
      })
      if (result.error) throw result.error
      toast.success(t("verify.successTitle"), {
        description: t("forgot.successDescription"),
      })
      return true
    } catch (caught) {
      toast.error(t("toast.sendError"), {
        description: getErrorMessage(caught, t),
      })
      return false
    }
  }
  return { capabilities, resend }
}

function CheckInbox({
  email,
  initialCooldown,
  signedIn,
}: {
  email: string
  initialCooldown: number
  signedIn: boolean
}) {
  const { t } = useLocale()
  const { capabilities, resend } = useResendVerification()
  const [cooldown, setCooldown] = useState(initialCooldown)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(
      () => setCooldown((value) => value - 1),
      1000
    )
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const [before, after = ""] = t("verify.checkInboxDescription", {
    email: "\u0000",
  }).split("\u0000")

  return (
    <Card>
      <CardHeader className="items-start gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <CardTitle className="text-2xl">
          {t("verify.checkInboxTitle")}
        </CardTitle>
        <CardDescription className="text-base">
          {before}
          <strong className="font-semibold break-all text-foreground">
            {email}
          </strong>
          {after}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ol
          aria-label={t("verify.stepsLabel")}
          className="flex flex-col gap-3 text-sm"
        >
          {(
            [
              "verify.stepOpen",
              "verify.stepClick",
              "verify.stepProfile",
            ] as const
          ).map((key, index) => (
            <li key={key} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border font-mono text-xs">
                {index + 1}
              </span>
              <span className="pt-0.5">{t(key)}</span>
            </li>
          ))}
        </ol>
        {capabilities !== undefined && !capabilities.emailDelivery ? (
          <Alert>
            <AlertTitle>{t("verify.deliveryUnavailableTitle")}</AlertTitle>
            <AlertDescription>
              {t("verify.deliveryUnavailableDescription")}
            </AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={
            pending || cooldown > 0 || capabilities?.emailDelivery !== true
          }
          onClick={async () => {
            setPending(true)
            const sent = await resend(email)
            setPending(false)
            if (sent) setCooldown(RESEND_COOLDOWN_SECONDS)
          }}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {cooldown > 0
            ? t("verify.resendIn", { seconds: String(cooldown) })
            : t("verify.submit")}
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-1 text-sm text-muted-foreground">
        {signedIn ? null : (
          <p>
            {t("verify.wrongEmail")}{" "}
            <Link to="/auth/sign-up" className="text-foreground underline">
              {t("verify.restartSignUp")}
            </Link>
          </p>
        )}
        {signedIn ? null : (
          <p>
            {t("verify.alreadyVerified")}{" "}
            <Link to="/auth/sign-in" className="text-foreground underline">
              {t("signIn.submit")}
            </Link>
          </p>
        )}
      </CardFooter>
    </Card>
  )
}

function ResendVerificationForm() {
  const { t } = useLocale()
  const { capabilities, resend } = useResendVerification()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      setError(null)
      if (await resend(value.email)) setNotice(t("verify.notice"))
      else if (capabilities?.emailDelivery) setError(t("toast.sendError"))
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

function VerifyEmailSkeleton() {
  const { t } = useLocale()
  return (
    <Card aria-label={t("common.loadingAccount")}>
      <CardHeader className="gap-3">
        <Skeleton className="size-12 rounded-2xl" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-4/5" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}
