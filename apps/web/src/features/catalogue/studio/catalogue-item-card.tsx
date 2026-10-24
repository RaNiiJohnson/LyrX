import { Link } from "@tanstack/react-router"
import type { FunctionReturnType } from "convex/server"
import {
  Disc3,
  EyeOff,
  FileMusic,
  MoreHorizontal,
  Pencil,
  Send,
} from "lucide-react"

import type { api } from "@lyrx/backend/convex/_generated/api"
import type { Doc } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyrx/ui/components/dropdown-menu"

import { useLocale } from "@/app/locale-provider"
import { usePublicationControl } from "./use-publication-control"

type SongSummary = FunctionReturnType<
  typeof api.catalogue.read.listMySongs
>["page"][number]

export function SongCard({ song }: { song: SongSummary }) {
  return (
    <CatalogueItemRow kind="song" item={song} subtitle={song.primaryArtist} />
  )
}

export function AlbumCard({ album }: { album: Doc<"albums"> }) {
  return <CatalogueItemRow kind="album" item={album} />
}

function CatalogueItemRow({
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
    <article className="relative flex min-w-0 flex-col border-b py-3 last:border-b-0">
      <Link
        to={previewTo}
        params={params}
        aria-label={item.title}
        className="absolute inset-0 z-0 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      />
      <div className="pointer-events-none relative z-10 flex min-w-0 items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground sm:size-14">
          {kind === "song" ? <FileMusic /> : <Disc3 />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{item.title}</p>
          {subtitle ? (
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
          <div className="mt-1 sm:hidden">
            <StatusBadge status={item.status} />
          </div>
        </div>

        <div className="pointer-events-auto hidden items-center gap-2 sm:flex">
          <StatusBadge status={item.status} />
          <Button asChild variant="outline" size="sm">
            <Link to={editTo} params={params}>
              <Pencil data-icon="inline-start" /> {t("catalogue.edit")}
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={item.status === "draft" ? "default" : "secondary"}
            disabled={publication.pending}
            onClick={() => void publication.changeStatus()}
          >
            {item.status === "draft" ? (
              <Send data-icon="inline-start" />
            ) : (
              <EyeOff data-icon="inline-start" />
            )}
            {item.status === "draft"
              ? t("catalogue.publish")
              : t("catalogue.unpublish")}
          </Button>
        </div>

        <div className="pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="sm:hidden"
                aria-label={t("catalogue.moreActions")}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to={editTo} params={params}>
                    <Pencil /> {t("catalogue.edit")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant={item.status === "draft" ? "primary" : "default"}
                  disabled={publication.pending}
                  onSelect={() => void publication.changeStatus()}
                >
                  {item.status === "draft" ? <Send /> : <EyeOff />}
                  {item.status === "draft"
                    ? t("catalogue.publish")
                    : t("catalogue.unpublish")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {publication.error ? (
        <Alert variant="destructive" className="relative z-10 mt-2">
          <AlertDescription>{publication.error}</AlertDescription>
        </Alert>
      ) : null}
    </article>
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
