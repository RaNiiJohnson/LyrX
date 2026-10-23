import { Link } from "@tanstack/react-router"
import type { FunctionReturnType } from "convex/server"

import type { api } from "@lyrx/backend/convex/_generated/api"
import type { Doc } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { Checkbox } from "@lyrx/ui/components/checkbox"

import { useLocale } from "@/app/locale-provider"
import { usePublicationControl } from "./use-publication-control"

type SongSummary = FunctionReturnType<
  typeof api.catalogue.listMySongs
>["page"][number]

export function SongCard({ song }: { song: SongSummary }) {
  return (
    <CatalogueItemCard kind="song" item={song} subtitle={song.primaryArtist} />
  )
}

export function AlbumCard({ album }: { album: Doc<"albums"> }) {
  return <CatalogueItemCard kind="album" item={album} />
}

function CatalogueItemCard({
  kind,
  item,
  subtitle,
}:
  | { kind: "song"; item: SongSummary; subtitle?: string }
  | { kind: "album"; item: Doc<"albums">; subtitle?: string }) {
  const { t } = useLocale()
  const publication = usePublicationControl(
    { kind, id: item._id } as Parameters<typeof usePublicationControl>[0],
    item.status
  )
  const editTo =
    kind === "song" ? "/studio/songs/$songId" : "/studio/albums/$albumId"
  const previewTo =
    kind === "song"
      ? "/studio/songs/$songId/preview"
      : "/studio/albums/$albumId/preview"
  const params = kind === "song" ? { songId: item._id } : { albumId: item._id }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{item.title}</CardTitle>
            {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
          </div>
          <StatusBadge status={item.status} />
        </div>
      </CardHeader>
      {item.status === "draft" || publication.error ? (
        <CardContent>
          <div className="space-y-4">
            {item.status === "draft" ? (
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                <Checkbox
                  checked={publication.rightsConfirmed}
                  onCheckedChange={(checked) =>
                    publication.setRightsConfirmed(checked === true)
                  }
                />
                <span>{t("catalogue.rightsConfirmation")}</span>
              </label>
            ) : null}
            {publication.error ? (
              <Alert variant="destructive">
                <AlertTitle>{t("catalogue.saveError")}</AlertTitle>
                <AlertDescription>{publication.error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      ) : null}
      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={editTo} params={params}>
            {t("catalogue.edit")}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to={previewTo} params={params}>
            {t("catalogue.preview")}
          </Link>
        </Button>
        <Button
          type="button"
          variant={item.status === "draft" ? "default" : "secondary"}
          size="sm"
          disabled={
            publication.pending ||
            (item.status === "draft" && !publication.rightsConfirmed)
          }
          onClick={() => void publication.changeStatus()}
        >
          {item.status === "draft"
            ? t("catalogue.publish")
            : t("catalogue.unpublish")}
        </Button>
      </CardFooter>
    </Card>
  )
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  const { t } = useLocale()
  return (
    <Badge variant={status === "published" ? "default" : "secondary"}>
      {status === "published" ? t("catalogue.published") : t("catalogue.draft")}
    </Badge>
  )
}
