import { Linking, Pressable, Text, View } from "react-native"
import { Stack } from "expo-router"
import { Lyrics } from "@/components/lyrics"
import { Badge, Cover, Eyebrow, Heading, Screen } from "@/components/ui"
import { currentLocale, t } from "@/lib/i18n"
import { safeExternalUrl } from "@/lib/routes"
import { fonts, radius, space, useTheme } from "@/lib/theme"

const PROVIDERS: Record<string, string> = {
  spotify: "Spotify",
  "apple-music": "Apple Music",
  youtube: "YouTube",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
  mediafire: "MediaFire",
  other: "Web",
}

const GENRES = {
  electronic: "studio.genreElectronic",
  folk: "studio.genreFolk",
  gospel: "studio.genreGospel",
  "hip-hop": "studio.genreHipHop",
  jazz: "studio.genreJazz",
  pop: "studio.genrePop",
  reggae: "studio.genreReggae",
  rnb: "studio.genreRnb",
  rock: "studio.genreRock",
} as const

export function genreLabel(genre?: string, otherGenre?: string) {
  if (!genre) return undefined
  if (genre === "other") return otherGenre
  return genre in GENRES ? t(GENRES[genre as keyof typeof GENRES]) : undefined
}

export function shortDate(date: number | undefined) {
  if (date === undefined) return undefined
  return new Intl.DateTimeFormat(currentLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

/** Read-only song layout shared by official songs and community contributions, mirroring the web page. */
export function SongPage({
  title,
  primaryArtist,
  guestArtists = [],
  artworkUrl,
  badges = [],
  context,
  links = [],
  lyricsText,
}: {
  title: string
  primaryArtist: string
  guestArtists?: Array<string>
  artworkUrl: string | null
  badges?: Array<string>
  context?: string
  links?: Array<{ provider: string; url: string }>
  lyricsText: string
}) {
  const theme = useTheme()
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <View
        style={{ flexDirection: "row", gap: space.md, alignItems: "flex-end" }}
      >
        <Cover uri={artworkUrl} label={title} size={104} rounded={radius.lg} />
        <View style={{ flex: 1, gap: space.xs }}>
          <Eyebrow style={{ letterSpacing: 1.6 }}>
            {primaryArtist}
            {guestArtists.length ? (
              <Text
                style={{
                  color: theme.mutedForeground,
                  textTransform: "none",
                }}
              >
                {"  "}feat. {guestArtists.join(", ")}
              </Text>
            ) : null}
          </Eyebrow>
          <Heading level={1}>{title}</Heading>
        </View>
      </View>
      {badges.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {badges.map((badge) => (
            <Badge key={badge} label={badge} />
          ))}
        </View>
      ) : null}
      {context ? (
        <Text
          style={{
            color: theme.mutedForeground,
            fontFamily: fonts.serifItalic,
            fontSize: 18,
            lineHeight: 28,
          }}
        >
          {context}
        </Text>
      ) : null}
      {links.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {links.map((link) => {
            const url = safeExternalUrl(link.url)
            if (!url) return null
            return (
              <Pressable
                key={url}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(url)}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: space.md,
                  borderRadius: radius.pill,
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: theme.primaryForeground,
                    fontFamily: fonts.sansSemibold,
                  }}
                >
                  {t("studio.listeningStart", {
                    provider: PROVIDERS[link.provider] ?? "Web",
                  })}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
      <View style={{ gap: space.md }}>
        <Heading>{t("studio.lyrics")}</Heading>
        <Lyrics text={lyricsText} />
      </View>
    </Screen>
  )
}
