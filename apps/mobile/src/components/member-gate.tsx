import type { ReactNode } from "react"
import { useRouter } from "expo-router"
import { useActiveMember } from "@/components/song-interactions"
import { Loading, Message, Screen } from "@/components/ui"
import { t } from "@/lib/i18n"

/** Renders `children` only for an active member (optionally of one role); otherwise a sign-in or role notice. */
export function MemberGate({
  role,
  signInTitle,
  children,
}: {
  role?: "fan" | "artist"
  signInTitle: string
  children: ReactNode
}) {
  const router = useRouter()
  const member = useActiveMember()
  if (member.loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  if (!member.ready)
    return (
      <Screen>
        <Message
          title={signInTitle}
          description={t("interactions.signInHint")}
          action={{
            label: t("interactions.signIn"),
            onPress: () => router.push("/account"),
          }}
        />
      </Screen>
    )
  if (role && member.role !== role)
    return (
      <Screen>
        <Message
          title={
            role === "fan"
              ? t("community.fanOnly")
              : t("error.artistRoleRequired")
          }
        />
      </Screen>
    )
  return <>{children}</>
}
