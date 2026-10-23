import { useQuery } from "convex/react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"

import { useLocale } from "@/app/locale-provider"
import { CatalogueEditorSkeleton } from "./shared/catalogue-loading"
import { SongEditorForm } from "./song/song-editor-form"

export function SongEditor({ songId }: { songId?: Id<"songs"> }) {
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
      primaryArtist={current.profile.displayName}
    />
  )
}

function SongEditorData({
  primaryArtist,
  songId,
}: {
  primaryArtist: string
  songId?: Id<"songs">
}) {
  const detail = useQuery(api.catalogue.getMySong, songId ? { songId } : "skip")
  if (songId && detail === undefined) return <CatalogueEditorSkeleton />
  return (
    <SongEditorForm
      key={songId ?? "new"}
      songId={songId}
      primaryArtist={primaryArtist}
      detail={detail ?? undefined}
    />
  )
}
