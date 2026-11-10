import { useState, type ReactNode } from "react"
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"
import { t } from "@/lib/i18n"
import { nativeHref } from "@/lib/routes"
import { fonts, radius, space, useTheme, withAlpha } from "@/lib/theme"

export const GUTTER = space.md

export function Screen({
  children,
  padded = true,
  onRefresh,
}: {
  children: ReactNode
  padded?: boolean
  /** Adds native pull-to-refresh; the spinner stays until the returned promise settles. */
  onRefresh?: () => Promise<unknown> | void
}) {
  const theme = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingHorizontal: padded ? GUTTER : 0,
        paddingTop: padded ? space.md : 0,
        paddingBottom: space.xl,
        gap: space.xl,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.mutedForeground}
            onRefresh={() => {
              setRefreshing(true)
              Promise.resolve(onRefresh())
                .catch(() => undefined)
                .finally(() => setRefreshing(false))
            }}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  )
}

export function Heading({
  children,
  level = 2,
}: {
  children: ReactNode
  level?: 1 | 2
}) {
  const theme = useTheme()
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: theme.foreground,
        fontFamily: fonts.sansSemibold,
        fontSize: level === 1 ? 30 : 20,
        lineHeight: level === 1 ? 36 : 26,
        letterSpacing: level === 1 ? -0.6 : -0.2,
      }}
    >
      {children}
    </Text>
  )
}

export function Body({
  children,
  muted,
  style,
  selectable,
}: {
  children: ReactNode
  muted?: boolean
  style?: StyleProp<TextStyle>
  selectable?: boolean
}) {
  const theme = useTheme()
  return (
    <Text
      selectable={selectable}
      style={[
        {
          color: muted ? theme.mutedForeground : theme.foreground,
          fontFamily: fonts.sans,
          fontSize: 16,
          lineHeight: 24,
        },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

/** Uppercase monospace caption used for artist lines and lyric section headings on the web. */
export function Eyebrow({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<TextStyle>
}) {
  const theme = useTheme()
  return (
    <Text
      style={[
        {
          color: theme.primary,
          fontFamily: fonts.mono,
          fontSize: 12,
          letterSpacing: 1.9,
          textTransform: "uppercase",
        },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

/** Square cover with the web's fallback: the title's first letter in the serif face on a muted tile. */
export function Cover({
  uri,
  label,
  size,
  rounded = radius.md,
  style,
}: {
  uri: string | null
  label: string
  size?: number
  rounded?: number
  style?: StyleProp<ViewStyle>
}) {
  const theme = useTheme()
  const box: ViewStyle = {
    ...(size === undefined ? { width: "100%" } : { width: size }),
    aspectRatio: 1,
    borderRadius: rounded,
    overflow: "hidden",
    backgroundColor: theme.muted,
  }
  return (
    <View style={[box, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(theme.brand, 0.18),
          }}
        >
          <Text
            style={{
              color: theme.foreground,
              fontFamily: fonts.serif,
              fontSize: size && size < 80 ? 26 : 48,
            }}
          >
            {label.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  )
}

export function Badge({
  label,
  overlay,
}: {
  label: string
  overlay?: boolean
}) {
  const theme = useTheme()
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: overlay
          ? withAlpha(theme.brandForeground, 0.8)
          : theme.secondary,
        borderWidth: overlay ? 1 : 0,
        borderColor: withAlpha(theme.heroForeground, 0.1),
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: overlay ? theme.heroForeground : theme.secondaryForeground,
          fontFamily: fonts.sansMedium,
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

/** A card/row target; entries the app cannot open natively yet stay visible but inert. */
function NativeLink({
  href,
  label,
  style,
  children,
}: {
  href: string
  label: string
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  const router = useRouter()
  const target = nativeHref(href)
  if (!target) return <View style={[style, { opacity: 0.7 }]}>{children}</View>
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push(target)}
      style={({ pressed }) => [style, { opacity: pressed ? 0.6 : 1 }]}
    >
      {children}
    </Pressable>
  )
}

function CardText({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme()
  return (
    <View style={{ gap: 2 }}>
      <Text
        numberOfLines={2}
        style={{
          color: theme.foreground,
          fontFamily: fonts.sansSemibold,
          fontSize: 16,
          lineHeight: 22,
        }}
      >
        {title}
      </Text>
      <Text
        numberOfLines={2}
        style={{
          color: theme.mutedForeground,
          fontFamily: fonts.sans,
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {subtitle}
      </Text>
    </View>
  )
}

export const CARD_WIDTH = 148
const ALBUM_COVER = Math.round(CARD_WIDTH * 0.85)

/** Horizontal discovery card: cover with a source badge, title and artist. */
export function CoverCard({
  href,
  artworkUrl,
  title,
  subtitle,
  badge,
}: {
  href: string
  artworkUrl: string | null
  title: string
  subtitle: string
  badge: string
}) {
  return (
    <NativeLink
      href={href}
      label={`${title}, ${subtitle}`}
      style={{ width: CARD_WIDTH, gap: space.sm + 4 }}
    >
      <View>
        <Cover uri={artworkUrl} label={title} size={CARD_WIDTH} />
        <View style={{ position: "absolute", top: 8, left: 8, right: 8 }}>
          <Badge label={badge} overlay />
        </View>
      </View>
      <CardText title={title} subtitle={subtitle} />
    </NativeLink>
  )
}

/** Album card with the vinyl peeking out behind the sleeve, as on the web. */
export function AlbumCard({
  href,
  artworkUrl,
  title,
  subtitle,
}: {
  href: string
  artworkUrl: string | null
  title: string
  subtitle: string
}) {
  const theme = useTheme()
  return (
    <NativeLink
      href={href}
      label={`${title}, ${subtitle}`}
      style={{ width: CARD_WIDTH, gap: space.sm + 4 }}
    >
      <View style={{ width: CARD_WIDTH, height: ALBUM_COVER }}>
        <View
          style={{
            position: "absolute",
            top: "8%",
            right: 0,
            width: CARD_WIDTH * 0.72,
            aspectRatio: 1,
            borderRadius: radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.brandForeground,
            borderWidth: 1,
            borderColor: withAlpha(theme.heroForeground, 0.15),
          }}
        >
          <View
            style={{
              width: "30%",
              aspectRatio: 1,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.muted,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: radius.pill,
                backgroundColor: theme.brandForeground,
              }}
            />
          </View>
        </View>
        <Cover
          uri={artworkUrl}
          label={title}
          size={ALBUM_COVER}
          rounded={radius.sm}
        />
      </View>
      <CardText title={title} subtitle={subtitle} />
    </NativeLink>
  )
}

export function ArtistCard({
  href,
  avatarUrl,
  name,
  handle,
  songCount,
}: {
  href: string
  avatarUrl: string | null
  name: string
  handle: string
  songCount: number
}) {
  const theme = useTheme()
  return (
    <NativeLink
      href={href}
      label={name}
      style={{ width: 112, alignItems: "center", gap: space.sm + 4 }}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: 96,
            height: 96,
            borderRadius: radius.pill,
            backgroundColor: theme.muted,
          }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.muted,
          }}
        >
          <Text
            style={{
              color: theme.mutedForeground,
              fontFamily: fonts.sansMedium,
              fontSize: 24,
            }}
          >
            {name.trim().slice(0, 2).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ alignItems: "center", gap: 2 }}>
        <Text
          numberOfLines={2}
          style={{
            color: theme.foreground,
            fontFamily: fonts.sansSemibold,
            fontSize: 16,
            textAlign: "center",
          }}
        >
          {name}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            color: theme.mutedForeground,
            fontFamily: fonts.sans,
            fontSize: 13,
            textAlign: "center",
          }}
        >
          @{handle} · {t("discovery.songsCount", { count: songCount })}
        </Text>
      </View>
    </NativeLink>
  )
}

/** Horizontal list row: 64px cover, semibold title, muted subtitle, hairline separator. */
export function SongRow({
  href,
  artworkUrl,
  title,
  subtitle,
}: {
  href: string
  artworkUrl: string | null
  title: string
  subtitle: string
}) {
  const theme = useTheme()
  return (
    <NativeLink
      href={href}
      label={`${title}, ${subtitle}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingVertical: space.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <Cover uri={artworkUrl} label={title} size={64} />
      <View style={{ flex: 1 }}>
        <CardText title={title} subtitle={subtitle} />
      </View>
    </NativeLink>
  )
}

/** List row for an artist: round avatar, name and handle with counts. */
export function ArtistRow({
  href,
  avatarUrl,
  name,
  handle,
  songCount,
}: {
  href: string
  avatarUrl: string | null
  name: string
  handle: string
  songCount: number
}) {
  const theme = useTheme()
  return (
    <NativeLink
      href={href}
      label={name}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingVertical: space.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <Cover uri={avatarUrl} label={name} size={64} rounded={radius.pill} />
      <View style={{ flex: 1 }}>
        <CardText
          title={name}
          subtitle={`@${handle} · ${t("discovery.songsCount", { count: songCount })}`}
        />
      </View>
    </NativeLink>
  )
}

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs, paddingHorizontal: GUTTER }}>
        <Heading>{title}</Heading>
        {description ? <Body muted>{description}</Body> : null}
      </View>
      {children}
    </View>
  )
}

export function HorizontalRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: GUTTER, gap: space.md }}
    >
      {children}
    </ScrollView>
  )
}

export function Loading() {
  const theme = useTheme()
  return (
    <View
      accessibilityLabel={t("common.loading")}
      style={{ padding: space.xl, alignItems: "center" }}
    >
      <ActivityIndicator color={theme.primary} />
    </View>
  )
}

export function Message({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: { label: string; onPress: () => void }
}) {
  const theme = useTheme()
  return (
    <View
      accessibilityRole="alert"
      style={{
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
      }}
    >
      <Text
        style={{
          color: theme.foreground,
          fontFamily: fonts.sansSemibold,
          fontSize: 16,
        }}
      >
        {title}
      </Text>
      {description ? <Body muted>{description}</Body> : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={{
            alignSelf: "flex-start",
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
            borderRadius: radius.pill,
            backgroundColor: theme.primary,
          }}
        >
          <Text
            style={{
              color: theme.primaryForeground,
              fontFamily: fonts.sansSemibold,
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export { NativeLink }
