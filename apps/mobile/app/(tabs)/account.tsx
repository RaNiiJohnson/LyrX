import { useEffect, useState } from "react"
import { View } from "react-native"
import { useRouter } from "expo-router"
import { useConvexAuth, useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { AuthPanel } from "@/components/auth-forms"
import { DeleteAccount } from "@/components/delete-account"
import { Button } from "@/components/form"
import { PreferencesPanel } from "@/components/preferences"
import {
  Body,
  Eyebrow,
  Heading,
  Loading,
  Message,
  Screen,
} from "@/components/ui"
import { VERIFIED_CALLBACK, authClient } from "@/lib/auth-client"
import { authErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import { space } from "@/lib/theme"

function SignOut() {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <View style={{ gap: space.sm }}>
      {failed ? <Message title={t("error.unexpected")} /> : null}
      <Button
        variant="outline"
        label={t("navigation.signOut")}
        loading={pending}
        onPress={() => {
          setPending(true)
          setFailed(false)
          authClient
            .signOut()
            .then((result) => setFailed(Boolean(result.error)))
            .catch(() => setFailed(true))
            .finally(() => setPending(false))
        }}
      />
    </View>
  )
}

function ResendVerification({ email }: { email?: string }) {
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  if (!email) return null
  return (
    <View style={{ gap: space.sm }}>
      {notice ? <Message title={notice} /> : null}
      <Button
        label={t("verify.submit")}
        loading={pending}
        onPress={() => {
          setPending(true)
          authClient
            .sendVerificationEmail({ email, callbackURL: VERIFIED_CALLBACK })
            .then((result) =>
              setNotice(
                result.error
                  ? t(authErrorKey(result.error))
                  : t("verify.notice")
              )
            )
            .catch((caught: unknown) => setNotice(t(authErrorKey(caught))))
            .finally(() => setPending(false))
        }}
      />
    </View>
  )
}

export default function AccountScreen() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const current = useQuery(api.members.current, isAuthenticated ? {} : "skip")
  // The auth state blips to "loading" whenever the session refetches (after sign-up,
  // when the app regains focus, around autofill). Only the first load may replace the
  // forms with a spinner; later blips would unmount them and wipe what was typed.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!isLoading) setSettled(true)
  }, [isLoading])

  if (!isAuthenticated && (settled || !isLoading))
    return (
      <Screen>
        <AuthPanel />
        <PreferencesPanel />
      </Screen>
    )
  if (isLoading || current === undefined)
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  if (current.state === "anonymous")
    return (
      <Screen>
        <AuthPanel />
        <PreferencesPanel />
      </Screen>
    )

  return (
    <Screen>
      {current.state === "ready" ? (
        <View style={{ gap: space.xs }}>
          <Eyebrow>@{current.profile.handle}</Eyebrow>
          <Heading level={1}>{current.profile.displayName}</Heading>
          <Body muted>
            {t("account.signedInAs", { name: current.profile.displayName })}
          </Body>
          <View style={{ gap: space.sm, paddingTop: space.md }}>
            <Button
              label={t("onboarding.alreadyEdit")}
              onPress={() => router.push("/profile-edit")}
            />
            <Button
              variant="outline"
              label={t("profile.viewPublic")}
              onPress={() =>
                router.push(
                  current.member.role === "artist"
                    ? `/artists/${current.profile.handle}`
                    : `/profiles/${current.profile.handle}`
                )
              }
            />
          </View>
          <View style={{ gap: space.sm }}>
            {current.member.role === "fan" ? (
              <Eyebrow>{t("navigation.fanTools")}</Eyebrow>
            ) : null}
            <Button
              variant="outline"
              label={t("interactions.likedSongs")}
              onPress={() => router.push("/liked")}
            />
            <Button
              variant="outline"
              label={t("notebook.title")}
              onPress={() => router.push("/notebook")}
            />
            {current.member.role === "fan" ? (
              <Button
                variant="outline"
                label={t("community.mine")}
                onPress={() => router.push("/contributions")}
              />
            ) : null}
          </View>
        </View>
      ) : current.state === "email-unverified" ? (
        <>
          <Message
            title={t("verify.title")}
            description={t("verify.description")}
          />
          <ResendVerification email={current.email} />
        </>
      ) : current.state === "suspended" ? (
        <Message title={t("error.accountSuspended")} />
      ) : (
        <>
          <Message
            title={t("onboarding.create")}
            description={t("onboarding.description")}
          />
          <Button
            label={t("onboarding.create")}
            onPress={() => router.push("/onboarding")}
          />
        </>
      )}
      <PreferencesPanel />
      <SignOut />
      {current.state === "ready" || current.state === "suspended" ? (
        <DeleteAccount />
      ) : null}
    </Screen>
  )
}
