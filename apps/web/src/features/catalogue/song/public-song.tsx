import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"

import { useLocale } from "@/app/locale-provider"
import { SongReadOnly } from "./song-read-only"
import { RecordPublicView } from "@/features/discovery/record-public-view"

export function PublicSong({ songId }: { songId: Id<"songs"> }) {
  const { t } = useLocale()
  const { data: detail } = useSuspenseQuery(
    convexQuery(api.catalogue.read.getPublishedSong, { songId })
  )

  if (!detail) {
    return (
      <Alert>
        <AlertTitle>{t("notFound.title")}</AlertTitle>
        <AlertDescription>{t("notFound.description")}</AlertDescription>
      </Alert>
    )
  }

  return <><RecordPublicView origin="artist" sourceId={songId} /><SongReadOnly detail={detail} /></>
}
