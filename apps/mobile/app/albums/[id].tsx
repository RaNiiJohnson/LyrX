import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { genreLabel, shortDate } from "@/components/song-page"
import { TOUCH } from "@/components/kit"
import {
  Badge,
  Body,
  Cover,
  Eyebrow,
  GUTTER,
  Heading,
  Loading,
  Message,
  Screen,
  Section,
} from "@/components/ui"
import { t } from "@/lib/i18n"
import { fonts, radius, space, useTheme } from "@/lib/theme"

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const theme = useTheme()
  const router = useRouter()
  const detail = useQuery(api.catalogue.read.getPublishedAlbum, {
    albumId: id as Id<"albums">,
  })
  if (detail === undefined)
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  if (detail === null)
    return (
      <Screen>
        <Message title={t("interactions.unavailable")} />
      </Screen>
    )
  const { album, artist, artworkUrl, tracks } = detail
  const badges = [
    genreLabel(album.genre, album.otherGenre),
    shortDate(album.releaseDate),
  ].filter((value): value is string => Boolean(value))
  return (
    <Screen padded={false}>
      <View
        style={{
          gap: space.md,
          paddingHorizontal: GUTTER,
          paddingTop: space.md,
        }}
      >
        <Cover
          uri={artworkUrl}
          label={album.title}
          size={200}
          rounded={radius.lg}
        />
        <Eyebrow>{t("studio.album")}</Eyebrow>
        <Heading level={1}>{album.title}</Heading>
        <Text
          style={{
            color: theme.mutedForeground,
            fontFamily: fonts.sans,
            fontSize: 16,
          }}
        >
          <Text
            accessibilityRole="link"
            onPress={() => router.push(`/artists/${artist.handle}`)}
            style={{ color: theme.foreground, fontFamily: fonts.sansSemibold }}
          >
            {artist.displayName}
          </Text>
          {" · "}
          {t(
            tracks.length === 1 ? "catalogue.trackOne" : "catalogue.trackMany",
            {
              count: tracks.length,
            }
          )}
        </Text>
        {badges.length ? (
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            {badges.map((badge) => (
              <Badge key={badge} label={badge} />
            ))}
          </View>
        ) : null}
        {album.description ? <Body muted>{album.description}</Body> : null}
      </View>
      <Section title={t("studio.albumTracks")}>
        <View
          accessibilityRole="list"
          style={{
            marginHorizontal: GUTTER,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
        >
          {tracks.map(({ position, song }) => (
            <Pressable
              key={song._id}
              accessibilityRole="link"
              accessibilityLabel={`${position + 1}. ${song.title}`}
              onPress={() => router.push(`/songs/${song._id}`)}
              style={({ pressed }) => ({
                minHeight: 64,
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                paddingHorizontal: space.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  width: 24,
                  textAlign: "right",
                  color: theme.mutedForeground,
                  fontFamily: fonts.mono,
                  fontSize: 14,
                }}
              >
                {position + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.foreground,
                    fontFamily: fonts.sansSemibold,
                    fontSize: 16,
                  }}
                >
                  {song.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.mutedForeground,
                    fontFamily: fonts.sans,
                    fontSize: 14,
                  }}
                >
                  {song.primaryArtist}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.mutedForeground}
                style={{ minWidth: TOUCH / 2 }}
              />
            </Pressable>
          ))}
        </View>
      </Section>
      {album.label || album.credits.length ? (
        <View style={{ gap: space.sm, paddingHorizontal: GUTTER }}>
          <Eyebrow>{t("studio.detailsAndCredits")}</Eyebrow>
          {album.label ? (
            <Body>
              <Text style={{ color: theme.mutedForeground }}>
                {t("studio.label")}:{" "}
              </Text>
              {album.label}
            </Body>
          ) : null}
          {album.credits.length ? (
            <Body>{album.credits.join("\n")}</Body>
          ) : null}
        </View>
      ) : null}
    </Screen>
  )
}
