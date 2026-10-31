import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { AlbumEditorForm } from "./album/album-editor-form"
import { ArtistAccess } from "./shared/artist-access"
import { CatalogueEditorSkeleton } from "./shared/catalogue-loading"

export function AlbumEditor({ albumId }: { albumId?: Id<"albums"> }) {
  return (
    <ArtistAccess>{() => <AlbumEditorData albumId={albumId} />}</ArtistAccess>
  )
}

function AlbumEditorData({ albumId }: { albumId?: Id<"albums"> }) {
  const detail = useQuery(
    api.catalogue.read.getMyAlbum,
    albumId ? { albumId } : "skip"
  )
  const songs = usePaginatedQuery(
    api.catalogue.read.listMySongs,
    {},
    { initialNumItems: 50 }
  )
  if ((albumId && detail === undefined) || songs.status === "LoadingFirstPage")
    return <CatalogueEditorSkeleton />
  const songChoices = [
    ...(detail?.tracks.map(({ song }) => ({
      _id: song._id,
      _creationTime: song._creationTime,
      status: song.status,
      title: song.title,
      primaryArtist: song.primaryArtist,
      albumId: detail.album._id,
      updatedAt: song.updatedAt,
    })) ?? []),
    ...songs.results.filter(
      (song) =>
        !detail?.tracks.some(({ song: track }) => track._id === song._id)
    ),
  ]
  return (
    <AlbumEditorForm
      key={albumId ?? "new"}
      albumId={albumId}
      detail={detail ?? undefined}
      songs={songChoices}
      songsStatus={songs.status}
      loadMoreSongs={songs.loadMore}
    />
  )
}
