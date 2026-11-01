import { useEffect } from "react"
import { ConvexProvider } from "convex/react"
import { useFonts } from "expo-font"
import { Stack, type ErrorBoundaryProps } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { Message, Screen } from "@/components/ui"
import { convex } from "@/lib/convex"
import { fontSources } from "@/lib/fonts"
import { t } from "@/lib/i18n"
import { fonts, useTheme } from "@/lib/theme"

void SplashScreen.preventAutoHideAsync()

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Screen>
      <Message
        title={t("error.title")}
        description={t("error.server")}
        action={{ label: t("notebook.retry"), onPress: () => void retry() }}
      />
    </Screen>
  )
}

export default function RootLayout() {
  const theme = useTheme()
  const [loaded, failed] = useFonts(fontSources)
  const ready = loaded || failed !== null
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])
  if (!ready) return null
  if (!convex)
    return (
      <Screen>
        <Message
          title={t("discovery.errorTitle")}
          description="EXPO_PUBLIC_CONVEX_URL is missing. Copy apps/mobile/.env.example to .env.local and restart Expo."
        />
      </Screen>
    )
  return (
    <ConvexProvider client={convex}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.foreground,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.sansSemibold },
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="songs/[id]" options={{ title: "" }} />
        <Stack.Screen name="community/[id]" options={{ title: "" }} />
      </Stack>
    </ConvexProvider>
  )
}
