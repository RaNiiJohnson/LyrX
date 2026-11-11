import { useEffect, useState } from "react"
import { View } from "react-native"
import { useRouter } from "expo-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@/components/form"
import { Segmented } from "@/components/kit"
import { ProfileFields } from "@/components/profile-fields"
import { Body, Heading, Loading, Message, Screen } from "@/components/ui"
import { authClient } from "@/lib/auth-client"
import { appErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import {
  EMPTY_PROFILE,
  profileErrors,
  profileInput,
  type ProfileValues,
} from "@/lib/profile-form"
import { space } from "@/lib/theme"

type Role = "artist" | "fan"

export default function OnboardingScreen() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const current = useQuery(api.members.current, isAuthenticated ? {} : "skip")
  const session = authClient.useSession()
  const completeOnboarding = useMutation(api.members.completeOnboarding)
  const [role, setRole] = useState<Role>("fan")
  const [values, setValues] = useState<ProfileValues>(EMPTY_PROFILE)
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prefill once from the sign-up name; never overwrite what the member typed.
  const sessionName = session.data?.user.name
  useEffect(() => {
    if (!sessionName) return
    setValues((previous) =>
      previous.displayName
        ? previous
        : { ...previous, displayName: sessionName }
    )
  }, [sessionName])

  if (isLoading || (isAuthenticated && current === undefined))
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  if (!isAuthenticated || current?.state === "anonymous")
    return (
      <Screen>
        <Message
          title={t("onboarding.signInTitle")}
          description={t("onboarding.signInDescription")}
          action={{
            label: t("navigation.account"),
            onPress: () => router.replace("/account"),
          }}
        />
      </Screen>
    )
  if (current?.state === "email-unverified")
    return (
      <Screen>
        <Message
          title={t("onboarding.emailUnverifiedTitle")}
          description={t("onboarding.emailUnverifiedDescription")}
        />
      </Screen>
    )
  if (current?.state === "suspended")
    return (
      <Screen>
        <Message
          title={t("error.accountSuspended")}
          description={t("onboarding.suspendedDescription")}
        />
      </Screen>
    )
  if (current?.state === "ready")
    return (
      <Screen>
        <Message
          title={t("onboarding.alreadyTitle")}
          description={t("onboarding.alreadyDescription", {
            role: t(
              current.member.role === "artist" ? "common.artist" : "common.fan"
            ),
          })}
          action={{
            label: t("onboarding.alreadyEdit"),
            onPress: () => router.replace("/profile-edit"),
          }}
        />
      </Screen>
    )

  const errors = submitted ? profileErrors(values) : {}
  const submit = () => {
    setSubmitted(true)
    setError(null)
    if (Object.keys(profileErrors(values)).length > 0) return
    setPending(true)
    completeOnboarding({ role, ...profileInput(values, role) })
      .then(() => router.replace("/account"))
      .catch((caught: unknown) => {
        setError(t(appErrorKey(caught)))
        setPending(false)
      })
  }

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <Heading level={1}>{t("onboarding.create")}</Heading>
        <Body muted>{t("onboarding.description")}</Body>
      </View>
      <View style={{ gap: space.sm }}>
        <Segmented<Role>
          label={t("onboarding.role")}
          value={role}
          onChange={setRole}
          options={[
            { value: "fan", label: t("common.fan") },
            { value: "artist", label: t("common.artist") },
          ]}
        />
        <Body muted>
          {t(
            role === "artist"
              ? "onboarding.artistRoleDescription"
              : "onboarding.fanRoleDescription"
          )}
        </Body>
      </View>
      <ProfileFields
        values={values}
        onChange={setValues}
        role={role}
        errors={errors}
        suggestHandleFromName
      />
      {error ? (
        <Message title={t("onboarding.profileError")} description={error} />
      ) : null}
      <Button
        label={t("onboarding.create")}
        loading={pending}
        onPress={submit}
      />
    </Screen>
  )
}
