import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { ArrowLeft } from "lucide-react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"

import { useLocale } from "@/app/locale-provider"
import { PreviewSkeleton } from "@/features/catalogue/shared/preview-skeleton"
import { SongReadOnly } from "./song-read-only"

export function SongPreview({ songId }: { songId: Id<"songs"> }) {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()
  if (current === undefined) return <PreviewSkeleton />
  if (current.state !== "ready" || current.member.role !== "artist") {
    return (
      <Alert>
        <AlertTitle>{t("studio.notArtistTitle")}</AlertTitle>
        <AlertDescription>{t("studio.notArtistDescription")}</AlertDescription>
      </Alert>
    )
  }
  return <ReadySongPreview songId={songId} />
}

function ReadySongPreview({ songId }: { songId: Id<"songs"> }) {
  const detail = useQuery(api.catalogue.getMySong, { songId })
  const { t } = useLocale()
  if (detail === undefined) return <PreviewSkeleton />

  return (
    <SongReadOnly
      detail={detail}
      actions={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link to="/studio/songs/$songId" params={{ songId }}>
              <ArrowLeft /> {t("catalogue.edit")}
            </Link>
          </Button>
          <Badge variant="outline">{t("catalogue.preview")}</Badge>
        </>
      }
    />
  )
}
