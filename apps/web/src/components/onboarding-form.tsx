import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { isValidDisplayName, isValidHandle } from "@lyrx/shared"
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

import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"
import { useLocale } from "./locale-provider"

type AccountRole = "artist" | "fan"

export function OnboardingForm() {
  const { t } = useLocale()
  const current = useQuery(api.members.current, {})
  const completeOnboarding = useMutation(api.members.completeOnboarding)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

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

  if (current === undefined) return <OnboardingSkeleton />
  if (current.state === "anonymous") {
    return (
      <Alert>
        <AlertTitle>{t("onboarding.signInTitle")}</AlertTitle>
        <AlertDescription>
          <Link to="/auth/sign-in">{t("onboarding.signInDescription")}</Link>
        </AlertDescription>
      </Alert>
    )
  }
  if (current.state === "email-unverified") {
    return (
      <Alert>
        <AlertTitle>{t("onboarding.emailUnverifiedTitle")}</AlertTitle>
        <AlertDescription>
          {t("onboarding.emailUnverifiedDescription", {
            email: current.email ?? t("auth.email").toLowerCase(),
          })}
        </AlertDescription>
      </Alert>
    )
  }
  if (current.state === "ready") {
    return (
      <Alert>
        <AlertTitle>{t("onboarding.alreadyTitle")}</AlertTitle>
        <AlertDescription>
          {t("onboarding.alreadyDescription", {
            role:
              current.member.role === "artist"
                ? t("common.artist")
                : t("common.fan"),
          })}{" "}
          <Link to="/profile">{t("onboarding.alreadyEdit")}</Link>
        </AlertDescription>
      </Alert>
    )
  }
  if (current.state === "suspended") {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("home.suspendedTitle")}</AlertTitle>
        <AlertDescription>
          {t("onboarding.suspendedDescription")}
        </AlertDescription>
      </Alert>
    )
  }

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
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value === "artist" || value === "fan") {
                        field.handleChange(value)
                      }
                    }}
                    onBlur={field.handleBlur}
                    aria-label={t("onboarding.role")}
                  >
                    <ToggleGroupItem value="fan">
                      {t("common.fan")}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="artist">
                      {t("common.artist")}
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}
              </form.Field>
              <FieldDescription>
                {t("onboarding.roleDescription")}
              </FieldDescription>
            </FieldSet>
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
                  required
                  minLength={3}
                  maxLength={30}
                  placeholder="rija.music"
                />
              )}
            </form.AppField>
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
                  required
                  minLength={2}
                  maxLength={80}
                />
              )}
            </form.AppField>
            <form.AppField name="bio">
              {(field) => (
                <field.TextareaField
                  id="bio"
                  label={t("onboarding.bio")}
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
                          maxLength={2000}
                        />
                      )}
                    </form.AppField>
                    <form.AppField name="instagramUrl">
                      {(field) => (
                        <field.TextField
                          id="instagram"
                          label="Instagram"
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
