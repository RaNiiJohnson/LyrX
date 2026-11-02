import { Link } from "@tanstack/react-router"
import type { FunctionReturnType } from "convex/server"
import {
  Disc3,
  ExternalLink,
  EyeOff,
  FileMusic,
  Heart,
  MoreHorizontal,
  Pencil,
  Send,
} from "lucide-react"
import { useState } from "react"

import type { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lyrx/ui/components/dropdown-menu"

import { useLocale } from "@/app/locale-provider"
import { relativeTime } from "@/lib/relative-time"
import { usePublicationControl } from "./use-publication-control"

type SongSummary = FunctionReturnType<
  typeof api.catalogue.read.listMySongs
>["page"][number]
type AlbumSummary = FunctionReturnType<
  typeof api.catalogue.read.listMyAlbums
>["page"][number]

export function SongCard({ song }: { song: SongSummary }) {
  return <CatalogueItemRow kind="song" item={song} />
}

export function AlbumCard({ album }: { album: AlbumSummary }) {
  return <CatalogueItemRow kind="album" item={album} />
}

type RowProps =
  { kind: "song"; item: SongSummary } | { kind: "album"; item: AlbumSummary }

function CatalogueItemRow(props: RowProps) {
  const { kind, item } = props
  const { t } = useLocale()
  const publication = usePublicationControl(
    { kind, id: item._id } as Parameters<typeof usePublicationControl>[0],
    item.status
  )
  const draft = item.status === "draft"
  const editTo =
    kind === "song" ? "/studio/songs/$songId" : "/studio/albums/$albumId"
  const manageTo =
    kind === "song"
      ? "/studio/songs/$songId/preview"
      : "/studio/albums/$albumId/preview"
  const publicTo = kind === "song" ? "/songs/$songId" : "/albums/$albumId"
  const params = kind === "song" ? { songId: item._id } : { albumId: item._id }

  return (
    <article className="relative flex min-w-0 flex-col border-b py-3 last:border-b-0">
      <Link
        to={manageTo}
        params={params}
        aria-label={item.title}
        className="absolute inset-0 z-0 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      />
      <div className="pointer-events-none relative z-10 flex min-w-0 items-center gap-3">
        <RowArtwork kind={kind} artworkUrl={item.artworkUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{item.title}</p>
          <RowDetails {...props} />
          <div className="pointer-events-auto mt-1.5 flex items-center gap-2 sm:hidden">
            <StatusBadge status={item.status} />
            {draft ? (
              // On phones the draft's next step sits under the title so the
              // details line keeps its full width.
              <PublishButton
                size="xs"
                pending={publication.pending}
                onPublish={() => void publication.changeStatus()}
              />
            ) : null}
          </div>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <span className="hidden sm:inline-flex">
            <StatusBadge status={item.status} />
          </span>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link to={editTo} params={params}>
              <Pencil data-icon="inline-start" /> {t("catalogue.edit")}
            </Link>
          </Button>
          {draft ? (
            <PublishButton
              size="sm"
              className="hidden sm:inline-flex"
              pending={publication.pending}
              onPublish={() => void publication.changeStatus()}
            />
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("catalogue.moreActions")}
                title={t("catalogue.moreActions")}
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
                {draft ? null : (
                  <DropdownMenuItem asChild>
                    <Link to={publicTo} params={params}>
                      <ExternalLink /> {t("studio.viewPublicPage")}
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              {draft ? null : (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      disabled={publication.pending}
                      onSelect={() => void publication.changeStatus()}
                    >
                      <EyeOff /> {t("catalogue.unpublish")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
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

function PublishButton({
  className,
  onPublish,
  pending,
  size,
}: {
  className?: string
  onPublish: () => void
  pending: boolean
  size: "xs" | "sm"
}) {
  const { t } = useLocale()
  return (
    <Button
      type="button"
      size={size}
      className={className}
      disabled={pending}
      onClick={onPublish}
    >
      <Send data-icon="inline-start" />
      {t("catalogue.publish")}
    </Button>
  )
}

function RowArtwork({
  artworkUrl,
  kind,
}: {
  artworkUrl: string | null
  kind: "song" | "album"
}) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground sm:size-14">
      {artworkUrl && !failed ? (
        <img
          src={artworkUrl}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : kind === "song" ? (
        <FileMusic />
      ) : (
        <Disc3 />
      )}
    </div>
  )
}

function RowDetails({ kind, item }: RowProps) {
  const { locale, t } = useLocale()
  // Read the clock once per render of the row: the list is reactive anyway.
  const [now] = useState(Date.now)
  const parts = [
    kind === "song"
      ? (item.albumTitle ?? t("studio.releaseSingle"))
      : item.trackCount === 1
        ? t("studio.trackCountOne")
        : t("studio.trackCountMany", { count: item.trackCount }),
    t("studio.updatedAgo", { time: relativeTime(item.updatedAt, now, locale) }),
  ]
  const likes =
    kind === "song" && item.status === "published" ? item.likeCount : 0
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <span className="truncate">{parts.join(" · ")}</span>
      {likes > 0 ? (
        <span
          className="inline-flex shrink-0 items-center gap-1"
          aria-label={t("studio.likesLabel", { count: likes })}
        >
          <span aria-hidden="true">·</span>
          <Heart className="size-3.5" aria-hidden="true" />
          {likes}
        </span>
      ) : null}
    </p>
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
