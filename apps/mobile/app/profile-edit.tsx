import { useState } from "react"
import { View } from "react-native"
import { useRouter } from "expo-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@/components/form"
import { ProfileFields } from "@/components/profile-fields"
import { ProfileImages } from "@/components/profile-images"
import { Heading, Loading, Message, Screen } from "@/components/ui"
import { appErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import {
  profileErrors,
  profileInput,
  valuesFromCurrent,
  type ProfileValues,
} from "@/lib/profile-form"
import { space } from "@/lib/theme"

type Ready = Extract<
  NonNullable<ReturnType<typeof useQuery<typeof api.members.current>>>,
  { state: "ready" }
>

function Editor({ current }: { current: Ready }) {
  const router = useRouter()
  const updateMyProfile = useMutation(api.members.updateMyProfile)
  const role = current.member.role === "artist" ? "artist" : "fan"
  // `current` carries storage ids; the resolved image URLs come from the public profile.
  const publicProfile = useQuery(api.members.publicByHandle, {
    handle: current.profile.handle,
  })
  const [values, setValues] = useState<ProfileValues>(() =>
    valuesFromCurrent(current.profile, current.artistProfile)
  )
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null
  )
  const errors = submitted ? profileErrors(values) : {}

  const save = () => {
    setSubmitted(true)
    setNotice(null)
    if (Object.keys(profileErrors(values)).length > 0) return
    setPending(true)
    updateMyProfile(profileInput(values, role))
      .then(() => setNotice({ ok: true, text: t("profile.saved") }))
      .catch((caught: unknown) =>
        setNotice({ ok: false, text: t(appErrorKey(caught)) })
      )
      .finally(() => setPending(false))
  }

  return (
    <Screen>
      <Heading level={1}>{t("onboarding.alreadyEdit")}</Heading>
      <ProfileImages
        role={role}
        avatarUrl={publicProfile?.avatarUrl}
        bannerUrl={publicProfile?.artist?.bannerUrl}
        initials={current.profile.displayName.trim().slice(0, 2).toUpperCase()}
      />
      <ProfileFields
        values={values}
        onChange={setValues}
        role={role}
        errors={errors}
      />
      {notice ? (
        <Message
          title={notice.ok ? notice.text : t("profile.saveError")}
          description={notice.ok ? undefined : notice.text}
        />
      ) : null}
      <View style={{ gap: space.sm }}>
        <Button label={t("profile.save")} loading={pending} onPress={save} />
        <Button
          variant="outline"
          label={t("profile.viewPublic")}
          onPress={() =>
            router.push(
              role === "artist"
                ? `/artists/${current.profile.handle}`
                : `/profiles/${current.profile.handle}`
            )
          }
        />
      </View>
    </Screen>
  )
}

export default function ProfileEditScreen() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const current = useQuery(api.members.current, isAuthenticated ? {} : "skip")
  if (isLoading || (isAuthenticated && current === undefined))
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  if (current?.state === "ready") return <Editor current={current} />
  return (
    <Screen>
      <Message
        title={t(
          current?.state === "onboarding-required"
            ? "onboarding.create"
            : "onboarding.signInTitle"
        )}
        action={{
          label: t(
            current?.state === "onboarding-required"
              ? "onboarding.create"
              : "navigation.account"
          ),
          onPress: () =>
            router.replace(
              current?.state === "onboarding-required"
                ? "/onboarding"
                : "/account"
            ),
        }}
      />
    </Screen>
  )
}
