import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { ArtistAccess } from "./shared/artist-access"
import { CatalogueEditorSkeleton } from "./shared/catalogue-loading"
import { SongEditorForm } from "./song/song-editor-form"

export function SongEditor({
  initialAlbumId,
  returnAlbumId,
  songId,
}: {
  initialAlbumId?: string
  returnAlbumId?: string
  songId?: Id<"songs">
}) {
  return (
    <ArtistAccess>
      {(current) => (
        <SongEditorData
          songId={songId}
          initialAlbumId={initialAlbumId as Id<"albums"> | undefined}
          returnAlbumId={returnAlbumId as Id<"albums"> | undefined}
          primaryArtist={current.profile.displayName}
        />
      )}
    </ArtistAccess>
  )
}

function SongEditorData({
  primaryArtist,
  initialAlbumId,
  returnAlbumId,
  songId,
}: {
  primaryArtist: string
  initialAlbumId?: Id<"albums">
  returnAlbumId?: Id<"albums">
  songId?: Id<"songs">
}) {
  const detail = useQuery(
    api.catalogue.read.getMySong,
    songId ? { songId } : "skip"
  )
  const initialAlbum = useQuery(
    api.catalogue.read.getMyAlbum,
    !songId && initialAlbumId ? { albumId: initialAlbumId } : "skip"
  )
  const albums = usePaginatedQuery(
    api.catalogue.read.listMyAlbums,
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
      returnAlbumId={returnAlbumId ?? initialAlbumId}
      albums={albumChoices}
    />
  )
}
