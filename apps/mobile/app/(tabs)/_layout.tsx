import { Tabs, useRouter } from "expo-router"
import { Brand } from "@/components/brand"
import { IconButton, type IconName } from "@/components/kit"
import { t } from "@/lib/i18n"
import { fonts, useTheme } from "@/lib/theme"
import { Ionicons } from "@expo/vector-icons"

function tabIcon(outline: IconName, filled: IconName) {
  return function TabIcon({ focused }: { focused: boolean }) {
    const theme = useTheme()
    return (
      <Ionicons
        name={focused ? filled : outline}
        size={24}
        color={focused ? theme.foreground : theme.mutedForeground}
      />
    )
  }
}

export default function TabsLayout() {
  const theme = useTheme()
  const router = useRouter()
  return (
    <Tabs
      screenOptions={{
        headerTitle: () => <Brand />,
        headerTitleAlign: "left",
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerRight: () => (
          <IconButton
            icon="search-outline"
            label={t("search.title")}
            onPress={() => router.push("/search")}
          />
        ),
        headerRightContainerStyle: { paddingRight: 8 },
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.foreground,
        tabBarInactiveTintColor: theme.mutedForeground,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: { fontSize: 12, fontFamily: fonts.sansMedium },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("navigation.home"),
          tabBarIcon: tabIcon("home-outline", "home"),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("navigation.account"),
          tabBarIcon: tabIcon("person-outline", "person"),
        }}
      />
    </Tabs>
  )
}
