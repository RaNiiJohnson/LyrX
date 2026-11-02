import { useMutation, useQuery } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { Navigate, useNavigate } from "@tanstack/react-router"
import { Mic2, UserRound } from "lucide-react"

import { api } from "@lyrx/backend/convex/_generated/api"
import { isValidDisplayName, isValidHandle, suggestHandle } from "@lyrx/shared"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@lyrx/ui/components/field"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@lyrx/ui/components/toggle-group"
import { toast } from "@lyrx/ui/lib/toast"

import { getSignedInDestination } from "@/lib/account-navigation"
import { useAppForm } from "@/lib/app-form"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { useLocale } from "@/app/locale-provider"

type AccountRole = "artist" | "fan"

function OptionalLabel() {
  const { t } = useLocale()
  return (
    <span className="text-xs font-normal text-muted-foreground">
      {t("common.optional")}
    </span>
  )
}

export function OnboardingForm() {
  const current = useQuery(api.members.current, {})

  if (current === undefined) return <OnboardingSkeleton />
  // Only a signed-in member whose email link was opened and who has no profile
  // yet may see this form. Every other state goes to its own page; the server
  // still enforces the same rule in completeOnboarding.
  if (current.state === "anonymous") {
    return <Navigate to="/auth/sign-in" replace />
  }
  if (current.state !== "onboarding-required") {
    return (
      <Navigate to={getSignedInDestination(current.state) ?? "/"} replace />
    )
  }

  return <ReadyOnboardingForm />
}

function ReadyOnboardingForm() {
  const { t } = useLocale()
  const completeOnboarding = useMutation(api.members.completeOnboarding)
  const navigate = useNavigate()
  const session = authClient.useSession()
  const [error, setError] = useState<string | null>(null)
  // The handle follows the display name until the member edits it directly.
  const handleEdited = useRef(false)
  const signUpName = session.data?.user.name

  const form = useAppForm({
    defaultValues: {
      role: "fan" as AccountRole,
      handle: "",
      displayName: "",
      bio: "",
      presentation: "",
      instagramUrl: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        await completeOnboarding({
          role: value.role,
          handle: value.handle,
          displayName: value.displayName,
          bio: value.bio || undefined,
          artist:
            value.role === "artist"
              ? {
                  presentation: value.presentation || undefined,
                  instagramUrl: value.instagramUrl || undefined,
                  customLinks: [],
                }
              : undefined,
        })
        toast.success(t("onboarding.profileCreated"))
        await navigate({ to: "/profile" })
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("onboarding.profileError"), { description: message })
      }
    },
  })

  // Reuse the name typed at sign-up instead of asking for it twice.
  useEffect(() => {
    if (!signUpName || form.getFieldValue("displayName")) return
    form.setFieldValue("displayName", signUpName, { dontUpdateMeta: true })
    if (!handleEdited.current)
      form.setFieldValue("handle", suggestHandle(signUpName), {
        dontUpdateMeta: true,
      })
  }, [form, signUpName])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("home.onboardingTitle")}</CardTitle>
        <CardDescription>{t("onboarding.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
          className="flex flex-col gap-5"
        >
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{t("onboarding.profileError")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <FieldSet>
              <FieldLegend>{t("onboarding.role")}</FieldLegend>
              <form.Field name="role">
                {(field) => (
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2"
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value === "artist" || value === "fan") {
                        field.handleChange(value)
                      }
                    }}
                    onBlur={field.handleBlur}
                    aria-label={t("onboarding.role")}
                  >
                    <ToggleGroupItem
                      value="fan"
                      className="h-auto min-h-24 w-full items-start justify-start gap-3 p-4 text-left whitespace-normal data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground"
                    >
                      <UserRound className="mt-0.5 size-5" />
                      <span className="space-y-1">
                        <span className="block font-semibold">
                          {t("common.fan")}
                        </span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {t("onboarding.fanRoleDescription")}
                        </span>
                      </span>
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="artist"
                      className="h-auto min-h-24 w-full items-start justify-start gap-3 p-4 text-left whitespace-normal data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground"
                    >
                      <Mic2 className="mt-0.5 size-5" />
                      <span className="space-y-1">
                        <span className="block font-semibold">
                          {t("common.artist")}
                        </span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {t("onboarding.artistRoleDescription")}
                        </span>
                      </span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}
              </form.Field>
              <FieldDescription>
                {t("onboarding.roleDescription")}
              </FieldDescription>
            </FieldSet>
            <FieldSet className="min-w-0">
              <FieldLegend>{t("onboarding.identityTitle")}</FieldLegend>
              <FieldDescription>
                {t("onboarding.identityDescription")}
              </FieldDescription>
              <form.AppField
                name="displayName"
                validators={{
                  onBlur: ({ value }) =>
                    isValidDisplayName(value)
                      ? undefined
                      : t("error.invalidDisplayName"),
                }}
              >
                {(field) => (
                  <field.TextField
                    id="displayName"
                    label={t("signUp.displayName")}
                    description={t("onboarding.displayNameDescription")}
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder="Rija Rasolo"
                    onValueChange={(value) => {
                      if (!handleEdited.current)
                        form.setFieldValue("handle", suggestHandle(value))
                    }}
                  />
                )}
              </form.AppField>
              <form.AppField
                name="handle"
                validators={{
                  onBlur: ({ value }) =>
                    isValidHandle(value) ? undefined : t("error.invalidHandle"),
                }}
              >
                {(field) => (
                  <field.TextField
                    id="handle"
                    label={t("onboarding.handle")}
                    description={t("onboarding.handleDescription")}
                    prefix="@"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    minLength={3}
                    maxLength={30}
                    placeholder="rija.rasolo"
                    onValueChange={(value) => {
                      handleEdited.current = value.length > 0
                    }}
                  />
                )}
              </form.AppField>
              <form.Subscribe
                selector={(state) =>
                  [state.values.displayName, state.values.handle] as const
                }
              >
                {([displayName, handle]) => (
                  <IdentityPreview displayName={displayName} handle={handle} />
                )}
              </form.Subscribe>
            </FieldSet>
            <form.AppField name="bio">
              {(field) => (
                <field.TextareaField
                  id="bio"
                  label={t("onboarding.bio")}
                  labelExtra={<OptionalLabel />}
                  maxLength={500}
                />
              )}
            </form.AppField>
            <form.Subscribe selector={(state) => state.values.role}>
              {(role) =>
                role === "artist" ? (
                  <FieldSet>
                    <FieldLegend>{t("onboarding.artistProfile")}</FieldLegend>
                    <form.AppField name="presentation">
                      {(field) => (
                        <field.TextareaField
                          id="presentation"
                          label={t("onboarding.presentation")}
                          labelExtra={<OptionalLabel />}
                          maxLength={2000}
                        />
                      )}
                    </form.AppField>
                    <form.AppField name="instagramUrl">
                      {(field) => (
                        <field.TextField
                          id="instagram"
                          label="Instagram"
                          labelExtra={<OptionalLabel />}
                          type="url"
                          placeholder="https://instagram.com/..."
                        />
                      )}
                    </form.AppField>
                  </FieldSet>
                ) : null
              }
            </form.Subscribe>
          </FieldGroup>
          <form.AppForm>
            <form.SubmitButton size="lg">
              {t("onboarding.create")}
            </form.SubmitButton>
          </form.AppForm>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          {t("onboarding.adminNotice")}
        </p>
      </CardFooter>
    </Card>
  )
}

function IdentityPreview({
  displayName,
  handle,
}: {
  displayName: string
  handle: string
}) {
  const { t } = useLocale()
  const name = displayName.trim() || t("onboarding.previewName")
  const shownHandle = handle.trim().toLocaleLowerCase("en-US")
  return (
    <div
      aria-label={t("onboarding.previewLabel")}
      className="flex min-w-0 items-center gap-3 rounded-xl border bg-muted/40 p-3"
    >
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-base font-semibold text-brand-foreground"
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">{name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          @{shownHandle || t("onboarding.previewHandle")}
        </span>
        {shownHandle ? (
          <span className="block truncate text-xs text-muted-foreground">
            {t("onboarding.profileAddress", {
              path: `/profiles/${shownHandle}`,
            })}
          </span>
        ) : null}
      </span>
    </div>
  )
}

function OnboardingSkeleton() {
  const { t } = useLocale()
  return (
    <Card aria-label={t("common.loadingOnboarding")}>
      <CardHeader className="gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-4/5" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-40" />
      </CardFooter>
    </Card>
  )
}
