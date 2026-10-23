import { useQuery } from "convex/react"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"

import { useLocale } from "@/app/locale-provider"
import { CatalogueEditorSkeleton } from "./shared/catalogue-loading"
import { CatalogueDashboard } from "./studio/catalogue-dashboard"

export function ArtistStudio() {
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
  return <CatalogueDashboard />
}
