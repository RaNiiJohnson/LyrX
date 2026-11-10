import { useEffect, useState } from "react"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { useFonts } from "expo-font"
import { Stack, type ErrorBoundaryProps } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { Message, Screen } from "@/components/ui"
import { providerAuthClient } from "@/lib/auth-client"
import { convex } from "@/lib/convex"
import { fontSources } from "@/lib/fonts"
import { t, useLocale } from "@/lib/i18n"
import { hydratePreferences } from "@/lib/preferences-store"
import { fonts, useScheme, useTheme } from "@/lib/theme"

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
  const scheme = useScheme()
  const locale = useLocale()
  const [loaded, failed] = useFonts(fontSources)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  useEffect(() => {
    void hydratePreferences().then(() => setPreferencesLoaded(true))
  }, [])
  const ready = (loaded || failed !== null) && preferencesLoaded
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
    <ConvexBetterAuthProvider client={convex} authClient={providerAuthClient}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        // Strings come from a module-level `t`, so a language change re-mounts the tree.
        key={locale}
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.foreground,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.sansSemibold },
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ title: t("search.title") }} />
        <Stack.Screen name="songs/[id]" options={{ title: "" }} />
        <Stack.Screen name="community/[id]" options={{ title: "" }} />
      </Stack>
    </ConvexBetterAuthProvider>
  )
}
