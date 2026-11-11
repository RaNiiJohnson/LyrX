import { useState } from "react"
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { useRouter } from "expo-router"
import { Badge, Cover } from "@/components/ui"
import { t } from "@/lib/i18n"
import { nativeHref } from "@/lib/routes"
import { fonts, radius, space, useTheme, withAlpha } from "@/lib/theme"

export type Release = {
  key: string
  href: string
  artworkUrl: string | null
  title: string
  context: string
  label: string
}

/** Dark "À découvrir" banner: blurred cover backdrop, serif title, pill action, swipeable. */
export function Hero({ releases }: { releases: Array<Release> }) {
  const theme = useTheme()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const [active, setActive] = useState(0)
  if (!releases.length) return null
  const index = Math.min(active, releases.length - 1)
  const current = releases[index]!
  const cover = Math.min(width * 0.5, 220)
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel={t("releases.title")}
      style={{ backgroundColor: theme.brandForeground, overflow: "hidden" }}
    >
      {current.artworkUrl ? (
        <Image
          source={{ uri: current.artworkUrl }}
          blurRadius={40}
          style={{
            ...absoluteFill,
            opacity: 0.45,
            transform: [{ scale: 1.3 }],
          }}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View
        pointerEvents="none"
        style={{
          ...absoluteFill,
          backgroundColor: withAlpha(theme.brandForeground, 0.55),
        }}
      />
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setActive(Math.round(event.nativeEvent.contentOffset.x / width))
        }
      >
        {releases.map((release) => {
          const target = nativeHref(release.href)
          return (
            <View
              key={release.key}
              style={{
                width,
                alignItems: "center",
                gap: space.md,
                paddingHorizontal: space.lg,
                paddingTop: space.lg,
                paddingBottom: space.xl + space.sm,
              }}
            >
              <View
                style={{
                  width: cover,
                  borderRadius: radius.xl,
                  shadowColor: "#000",
                  shadowOpacity: 0.5,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 12 },
                  elevation: 16,
                }}
              >
                <Cover
                  uri={release.artworkUrl}
                  label={release.title}
                  rounded={radius.xl}
                />
              </View>
              <View style={{ alignSelf: "center" }}>
                <Badge label={release.label} overlay />
              </View>
              <Text
                numberOfLines={3}
                style={{
                  color: theme.heroForeground,
                  fontFamily: fonts.serif,
                  fontSize: 38,
                  lineHeight: 44,
                  textAlign: "center",
                }}
              >
                {release.title}
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  color: withAlpha(theme.heroForeground, 0.9),
                  fontFamily: fonts.sans,
                  fontSize: 18,
                  textAlign: "center",
                }}
              >
                {release.context}
              </Text>
              {target ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push(target)}
                  style={({ pressed }) => ({
                    marginTop: space.sm,
                    alignSelf: "stretch",
                    alignItems: "center",
                    minHeight: 52,
                    justifyContent: "center",
                    borderRadius: radius.pill,
                    backgroundColor: theme.heroForeground,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: theme.brandForeground,
                      fontFamily: fonts.sansSemibold,
                      fontSize: 16,
                    }}
                  >
                    {t("releases.open")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )
        })}
      </ScrollView>
      {releases.length > 1 ? (
        <View
          accessibilityLabel={t("releases.carousel")}
          style={{
            position: "absolute",
            bottom: space.md,
            left: space.lg,
            right: space.lg,
            flexDirection: "row",
            gap: space.sm,
          }}
        >
          {releases.map((release, position) => (
            <View
              key={release.key}
              style={{
                flex: 1,
                height: 2,
                borderRadius: radius.pill,
                backgroundColor:
                  position === index
                    ? theme.brand
                    : withAlpha(theme.heroForeground, 0.35),
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

const absoluteFill = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const
