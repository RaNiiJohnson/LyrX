import { Image, Linking, Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import {
  AlbumCard,
  Badge,
  Body,
  CoverCard,
  Eyebrow,
  Heading,
  HorizontalRow,
  Loading,
  Message,
  Screen,
  Section,
} from "@/components/ui"
import { TOUCH } from "@/components/kit"
import { t } from "@/lib/i18n"
import { safeExternalUrl } from "@/lib/routes"
import { fonts, radius, space, useTheme } from "@/lib/theme"

const sourceLabel = (origin: string) =>
  t(
    origin === "community"
      ? "discovery.sourceCommunity"
      : "discovery.sourceArtist"
  )

function ArtistCatalogue({ handle }: { handle: string }) {
  const catalogue = useQuery(api.discovery.read.artistByHandle, { handle })
  if (!catalogue?.ready) return <Loading />
  return (
    <>
      {catalogue.songs.length ? (
        <Section title={`${t("discovery.songs")} · ${catalogue.songCount}`}>
          <HorizontalRow>
            {catalogue.songs.map((song) => (
              <CoverCard
                key={`${song.origin}-${song.id}`}
                href={song.href}
                artworkUrl={song.artworkUrl}
                title={song.title}
                subtitle={song.primaryArtist}
                badge={sourceLabel(song.origin)}
              />
            ))}
          </HorizontalRow>
        </Section>
      ) : null}
      {catalogue.albums.length ? (
        <Section title={`${t("discovery.albums")} · ${catalogue.albumCount}`}>
          <HorizontalRow>
            {catalogue.albums.map((album) => (
              <AlbumCard
                key={album.id}
                href={album.href}
                artworkUrl={album.artworkUrl}
                title={album.title}
                subtitle={album.artistName}
              />
            ))}
          </HorizontalRow>
        </Section>
      ) : null}
    </>
  )
}

/** Public profile for artists (with their catalogue) and fans, mirroring the web header. */
export function ProfilePage({
  handle,
  artistOnly,
}: {
  handle: string
  /** `/artists/:handle` only shows artists; `/profiles/:handle` shows any member. */
  artistOnly?: boolean
}) {
  const theme = useTheme()
  const profile = useQuery(api.members.publicByHandle, { handle })
  if (profile === undefined)
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  if (profile === null || (artistOnly && profile.role !== "artist"))
    return (
      <Screen>
        <Message
          title={t("profile.publicNotFoundTitle")}
          description={t("profile.publicNotFoundDescription")}
        />
      </Screen>
    )
  const artist = profile.artist
  const links = artist
    ? [
        { label: "Instagram", url: artist.instagramUrl },
        { label: "Facebook", url: artist.facebookUrl },
        { label: "TikTok", url: artist.tiktokUrl },
        { label: "YouTube", url: artist.youtubeUrl },
        { label: "Spotify", url: artist.spotifyUrl },
        ...artist.customLinks,
      ]
        .map((link) => ({
          label: link.label,
          url: link.url ? safeExternalUrl(link.url) : null,
        }))
        .filter((link): link is { label: string; url: string } =>
          Boolean(link.url)
        )
    : []
  return (
    <Screen padded={false}>
      {artist?.bannerUrl ? (
        <Image
          source={{ uri: artist.bannerUrl }}
          accessibilityIgnoresInvertColors
          style={{
            width: "100%",
            aspectRatio: 3,
            backgroundColor: theme.muted,
          }}
        />
      ) : null}
      <View style={{ paddingHorizontal: space.md, gap: space.md }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            marginTop: artist?.bannerUrl ? -space.xl : space.md,
          }}
        >
          {profile.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              accessibilityIgnoresInvertColors
              style={{
                width: 88,
                height: 88,
                borderRadius: radius.pill,
                backgroundColor: theme.muted,
                borderWidth: 4,
                borderColor: theme.background,
              }}
            />
          ) : (
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.muted,
                borderWidth: 4,
                borderColor: theme.background,
              }}
            >
              <Text
                style={{
                  color: theme.mutedForeground,
                  fontFamily: fonts.sansMedium,
                  fontSize: 26,
                }}
              >
                {profile.displayName.trim().slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, gap: space.xs }}>
            <Heading level={1}>{profile.displayName}</Heading>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.sm,
              }}
            >
              <Text
                style={{ color: theme.mutedForeground, fontFamily: fonts.sans }}
              >
                @{profile.handle}
              </Text>
              <Badge
                label={t(
                  profile.role === "artist" ? "common.artist" : "common.fan"
                )}
              />
            </View>
          </View>
        </View>
        {profile.bio ? <Body selectable>{profile.bio}</Body> : null}
      </View>
      {profile.role === "artist" ? (
        <ArtistCatalogue handle={profile.handle} />
      ) : null}
      {artist?.presentation || links.length ? (
        <View style={{ paddingHorizontal: space.md, gap: space.md }}>
          <Eyebrow>{t("profile.aboutArtist")}</Eyebrow>
          {artist?.presentation ? (
            <Body muted selectable>
              {artist.presentation}
            </Body>
          ) : null}
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            {links.map((link) => (
              <Pressable
                key={`${link.label}:${link.url}`}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(link.url)}
                style={{
                  minHeight: TOUCH,
                  paddingHorizontal: space.md,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.xs,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: theme.outline,
                }}
              >
                <Text
                  style={{
                    color: theme.foreground,
                    fontFamily: fonts.sansMedium,
                  }}
                >
                  {link.label}
                </Text>
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={theme.mutedForeground}
                />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  )
}
