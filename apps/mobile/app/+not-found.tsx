import { Stack, useRouter } from "expo-router"
import { Message, Screen } from "@/components/ui"
import { t } from "@/lib/i18n"

/** Landing for deep links that match no native screen (e.g. web-only admin paths). */
export default function NotFoundScreen() {
  const router = useRouter()
  return (
    <Screen>
      <Stack.Screen options={{ title: t("notFound.title") }} />
      <Message
        title={t("notFound.title")}
        description={t("notFound.description")}
        action={{
          label: t("navigation.home"),
          onPress: () => router.replace("/"),
        }}
      />
    </Screen>
  )
}
