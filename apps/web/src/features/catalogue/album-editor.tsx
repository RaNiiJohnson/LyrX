import { usePaginatedQuery, useQuery } from "convex/react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"

import { useLocale } from "@/app/locale-provider"
import { AlbumEditorForm } from "./album/album-editor-form"
import { CatalogueEditorSkeleton } from "./shared/catalogue-loading"

export function AlbumEditor({ albumId }: { albumId?: Id<"albums"> }) {
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
  return <AlbumEditorData albumId={albumId} />
}

function AlbumEditorData({ albumId }: { albumId?: Id<"albums"> }) {
  const detail = useQuery(
    api.catalogue.getMyAlbum,
    albumId ? { albumId } : "skip"
  )
  const songs = usePaginatedQuery(
    api.catalogue.listMySongs,
    {},
    { initialNumItems: 50 }
  )
  if ((albumId && detail === undefined) || songs.status === "LoadingFirstPage")
    return <CatalogueEditorSkeleton />
  return (
    <AlbumEditorForm
      key={albumId ?? "new"}
      albumId={albumId}
      detail={detail ?? undefined}
      songs={songs.results}
      songsStatus={songs.status}
      loadMoreSongs={songs.loadMore}
    />
  )
}
