import { useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Hero, type Release } from "@/components/hero"
import {
  AlbumCard,
  ArtistCard,
  CoverCard,
  HorizontalRow,
  Loading,
  Message,
  Screen,
  Section,
} from "@/components/ui"
import { t } from "@/lib/i18n"

const sourceLabel = (origin: string) =>
  t(
    origin === "community"
      ? "discovery.sourceCommunity"
      : "discovery.sourceArtist"
  )

export default function HomeScreen() {
  const home = useQuery(api.discovery.read.home, {})
  if (home === undefined)
    return (
      <Screen underTopBar>
        <Loading />
      </Screen>
    )
  if (!home.ready)
    return (
      <Screen underTopBar>
        <Message
          title={t("discovery.errorTitle")}
          description={t("search.unavailable")}
        />
      </Screen>
    )
  const empty =
    !home.songs.length && !home.albums.length && !home.artists.length
  const releases: Array<Release> = [
    ...home.songs.map((song) => ({
      key: `song-${song.origin}-${song.id}`,
      href: song.href,
      artworkUrl: song.artworkUrl,
      title: song.title,
      context: song.primaryArtist,
      label: sourceLabel(song.origin),
      publishedAt: song.firstPublishedAt,
    })),
    ...home.albums.map((album) => ({
      key: `album-${album.id}`,
      href: album.href,
      artworkUrl: album.artworkUrl,
      title: album.title,
      context: album.artistName,
      label: t("discovery.albums"),
      publishedAt: album.firstPublishedAt,
    })),
  ]
    .sort((a, b) => b.publishedAt - a.publishedAt || a.key.localeCompare(b.key))
    .slice(0, 6)
  return (
    <Screen padded={false}>
      <Hero releases={releases} />
      {empty ? (
        <Section title={t("discovery.emptyTitle")}>
          <Message
            title={t("discovery.emptyTitle")}
            description={t("discovery.emptyDescription")}
          />
        </Section>
      ) : null}
      {home.songs.length ? (
        <Section title={t("discovery.newest")}>
          <HorizontalRow>
            {home.songs.map((song) => (
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
      {home.popularSongs.length ? (
        <Section
          title={t("discovery.popular")}
          description={t("discovery.popularDescription")}
        >
          <HorizontalRow>
            {home.popularSongs.map((song) => (
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
      {home.albums.length ? (
        <Section title={t("discovery.albums")}>
          <HorizontalRow>
            {home.albums.map((album) => (
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
      {home.artists.length ? (
        <Section title={t("discovery.artists")}>
          <HorizontalRow>
            {home.artists.map((artist) => (
              <ArtistCard
                key={artist.handle}
                href={artist.href}
                avatarUrl={artist.avatarUrl}
                name={artist.displayName}
                handle={artist.handle}
                songCount={artist.songCount}
              />
            ))}
          </HorizontalRow>
        </Section>
      ) : null}
    </Screen>
  )
}
