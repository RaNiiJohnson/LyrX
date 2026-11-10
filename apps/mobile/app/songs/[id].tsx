import { useLocalSearchParams } from "expo-router"
import { useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { SongPage, genreLabel, shortDate } from "@/components/song-page"
import { Loading, Message, Screen } from "@/components/ui"
import { t } from "@/lib/i18n"

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const detail = useQuery(api.catalogue.read.getPublishedSong, {
    songId: id as Id<"songs">,
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
  const { song } = detail
  return (
    <SongPage
      title={song.title}
      primaryArtist={song.primaryArtist}
      guestArtists={song.guestArtists}
      artworkUrl={detail.artworkUrl}
      badges={[
        genreLabel(song.genre, song.otherGenre),
        shortDate(song.releaseDate),
      ].filter((value): value is string => Boolean(value))}
      album={
        detail.album
          ? { id: detail.album.albumId, title: detail.album.title }
          : undefined
      }
      context={song.context}
      links={song.listeningLinks}
      lyricsText={detail.lyricsText}
    />
  )
}
