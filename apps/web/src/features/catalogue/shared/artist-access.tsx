import type { ReactNode } from "react"
import type { FunctionReturnType } from "convex/server"
import { useQuery } from "convex/react"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"

import { useLocale } from "@/app/locale-provider"
import { CatalogueEditorSkeleton } from "./catalogue-loading"

type ReadyArtist = Extract<
  FunctionReturnType<typeof api.members.current>,
  { state: "ready" }
>

// Presentation gate only; Convex artist functions still enforce authorization.
export function ArtistAccess({
  children,
}: {
  children: (current: ReadyArtist) => ReactNode
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
  return children(current)
}
