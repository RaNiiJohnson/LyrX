import { usePaginatedQuery, useQuery } from "convex/react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"

import { useLocale } from "@/app/locale-provider"
import { CatalogueEditorSkeleton } from "./shared/catalogue-loading"
import { SongEditorForm } from "./song/song-editor-form"

export function SongEditor({
  initialAlbumId,
  songId,
}: {
  initialAlbumId?: string
  songId?: Id<"songs">
}) {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()

  if (current === undefined) return <CatalogueEditorSkeleton />
  if (current.state !== "ready" || current.member.role !== "artist") {
    return (
      <Alert>
        <AlertTitle>{t("studio.notArtistTitle")}</AlertTitle>
        <AlertDescription>{t("studio.notArtistDescription")}</AlertDescription>
      </Alert>
    )
  }
  return (
    <SongEditorData
      songId={songId}
      initialAlbumId={initialAlbumId as Id<"albums"> | undefined}
      primaryArtist={current.profile.displayName}
    />
  )
}

function SongEditorData({
  primaryArtist,
  initialAlbumId,
  songId,
}: {
  primaryArtist: string
  initialAlbumId?: Id<"albums">
  songId?: Id<"songs">
}) {
  const detail = useQuery(api.catalogue.getMySong, songId ? { songId } : "skip")
  const initialAlbum = useQuery(
    api.catalogue.getMyAlbum,
    !songId && initialAlbumId ? { albumId: initialAlbumId } : "skip"
  )
  const albums = usePaginatedQuery(
    api.catalogue.listMyAlbums,
    {},
    { initialNumItems: 50 }
  )
  if (
    (songId && detail === undefined) ||
    (!songId && initialAlbumId && initialAlbum === undefined) ||
    albums.status === "LoadingFirstPage"
  )
    return <CatalogueEditorSkeleton />
  const albumChoices = [
    ...(detail?.album ? [detail.album] : []),
    ...(initialAlbum ? [initialAlbum.album] : []),
    ...albums.results.filter(
      (album) =>
        album._id !== initialAlbum?.album._id &&
        album._id !== detail?.album?._id
    ),
  ]
  return (
    <SongEditorForm
      key={songId ?? initialAlbumId ?? "new"}
      songId={songId}
      primaryArtist={primaryArtist}
      detail={detail ?? undefined}
      initialAlbum={initialAlbum?.album ?? detail?.album ?? undefined}
      albums={albumChoices}
    />
  )
}
