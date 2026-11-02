import type { ComponentProps } from "react"
import { View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Tabs } from "expo-router"
import { TopBar } from "@/components/top-bar"
import { t } from "@/lib/i18n"
import { fonts, useTheme } from "@/lib/theme"

function tabIcon(name: ComponentProps<typeof Ionicons>["name"]) {
  return function TabIcon({ focused }: { focused: boolean }) {
    const theme = useTheme()
    return (
      <Ionicons
        name={name}
        size={22}
        color={focused ? theme.foreground : theme.mutedForeground}
      />
    )
  }
}

export default function TabsLayout() {
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.background },
          tabBarActiveTintColor: theme.foreground,
          tabBarInactiveTintColor: theme.mutedForeground,
          tabBarActiveBackgroundColor: theme.accent,
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
          tabBarItemStyle: { paddingVertical: 6 },
          tabBarLabelStyle: { fontSize: 12, fontFamily: fonts.sans },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("navigation.home"),
            tabBarIcon: tabIcon("home-outline"),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: t("search.title"),
            tabBarIcon: tabIcon("search-outline"),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: t("navigation.account"),
            tabBarIcon: tabIcon("person-outline"),
          }}
        />
      </Tabs>
      <TopBar />
    </View>
  )
}
