import { Link } from "@tanstack/react-router"
import { useQuery } from "convex-helpers/react/cache"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Button } from "@lyrx/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lyrx/ui/components/collapsible"
import { cn } from "@lyrx/ui/lib/utils"

import { useLocale } from "@/app/locale-provider"
import { CoverImage } from "@/features/discovery/discovery-cards"

type AlbumDetail = NonNullable<
  ReturnType<typeof useQuery<typeof api.catalogue.read.getPublishedAlbum>>
>

/**
 * Reads the published album once; the result is cached by album, so moving
 * between its tracks keeps the list on screen. Returns null while loading or
 * when the album is not public (the song page then simply has no album rail).
 */
export function usePublishedAlbum(albumId: Id<"albums"> | undefined) {
  const detail = useQuery(
    api.catalogue.read.getPublishedAlbum,
    albumId ? { albumId } : "skip"
  )
  return detail && detail.tracks.length > 0 ? detail : null
}

function useTrackPosition(detail: AlbumDetail, songId: Id<"songs">) {
  const index = detail.tracks.findIndex((track) => track.song._id === songId)
  return {
    index,
    previous: index > 0 ? detail.tracks[index - 1] : undefined,
    next:
      index >= 0 && index < detail.tracks.length - 1
        ? detail.tracks[index + 1]
        : undefined,
  }
}

function AlbumHeading({ detail }: { detail: AlbumDetail }) {
  const { t } = useLocale()
  return (
    <Link
      to="/albums/$albumId"
      params={{ albumId: detail.album._id }}
      className="group flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <CoverImage
        src={detail.artworkUrl}
        label={detail.album.title}
        album
        className="size-14 rounded-lg [&_span]:text-2xl"
      />
      <span className="min-w-0">
        <span className="block font-mono text-[0.7rem] tracking-[0.16em] text-primary uppercase">
          {t("albumNav.fromAlbum")}
        </span>
        <span className="block truncate font-semibold group-hover:underline">
          {detail.album.title}
        </span>
        <span className="block text-xs text-muted-foreground">
          {t("albumNav.openAlbum")}
        </span>
      </span>
    </Link>
  )
}

function TrackList({
  className,
  detail,
  songId,
}: {
  className?: string
  detail: AlbumDetail
  songId: Id<"songs">
}) {
  const { t } = useLocale()
  return (
    <ol
      aria-label={t("albumNav.tracks", { title: detail.album.title })}
      className={cn("flex flex-col", className)}
    >
      {detail.tracks.map((track, index) => {
        const current = track.song._id === songId
        return (
          <li key={track.song._id}>
            <Link
              to="/songs/$songId"
              params={{ songId: track.song._id }}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                current && "bg-primary/10 font-semibold text-foreground"
              )}
            >
              <span
                className={cn(
                  "w-5 shrink-0 text-right font-mono text-xs text-muted-foreground",
                  current && "text-primary"
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 truncate">{track.song.title}</span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

function StepButtons({
  detail,
  songId,
}: {
  detail: AlbumDetail
  songId: Id<"songs">
}) {
  const { t } = useLocale()
  const { previous, next } = useTrackPosition(detail, songId)
  return (
    <div className="flex shrink-0 items-center gap-1">
      {[
        { track: previous, label: t("albumNav.previous"), Icon: ChevronLeft },
        { track: next, label: t("albumNav.next"), Icon: ChevronRight },
      ].map(({ track, label, Icon }) =>
        track ? (
          <Button
            key={label}
            asChild
            variant="outline"
            size="icon"
            aria-label={label}
            title={label}
          >
            <Link to="/songs/$songId" params={{ songId: track.song._id }}>
              <Icon />
            </Link>
          </Button>
        ) : (
          <Button
            key={label}
            type="button"
            variant="outline"
            size="icon"
            aria-label={label}
            disabled
          >
            <Icon />
          </Button>
        )
      )}
    </div>
  )
}

/** Desktop: the album and all its tracks beside the lyrics. */
/** Desktop rail and phone bar for one song; renders nothing outside an album. */
export function AlbumTrackNavigation({
  albumId,
  songId,
}: {
  albumId: Id<"albums"> | undefined
  songId: Id<"songs">
}) {
  const detail = usePublishedAlbum(albumId)
  if (!detail) return null
  return (
    <>
      <div className="lg:hidden">
        <AlbumTrackBar detail={detail} songId={songId} />
      </div>
      <div className="hidden lg:block">
        <AlbumTrackRail detail={detail} songId={songId} />
      </div>
    </>
  )
}

export function AlbumTrackRail({
  detail,
  songId,
}: {
  detail: AlbumDetail
  songId: Id<"songs">
}) {
  const { t } = useLocale()
  const { index } = useTrackPosition(detail, songId)
  return (
    <aside className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <AlbumHeading detail={detail} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {index >= 0
            ? t("albumNav.trackOf", {
                position: index + 1,
                count: detail.tracks.length,
              })
            : null}
        </p>
        <StepButtons detail={detail} songId={songId} />
      </div>
      {/* Long albums scroll inside the sticky column instead of pushing it. */}
      <TrackList
        detail={detail}
        songId={songId}
        className="max-h-[40vh] overflow-y-auto"
      />
    </aside>
  )
}

/** Phones and tablets: a compact bar with previous/next and a track drawer. */
export function AlbumTrackBar({
  detail,
  songId,
}: {
  detail: AlbumDetail
  songId: Id<"songs">
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const { index } = useTrackPosition(detail, songId)
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-2xl border bg-card p-3"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <AlbumHeading detail={detail} />
        </div>
        <StepButtons detail={detail} songId={songId} />
      </div>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-between"
        >
          <span>
            {index >= 0
              ? t("albumNav.trackOf", {
                  position: index + 1,
                  count: detail.tracks.length,
                })
              : null}
          </span>
          <span className="flex items-center gap-1">
            {open ? t("albumNav.hideTracks") : t("albumNav.showTracks")}
            <ChevronDown
              data-icon="inline-end"
              className={cn("transition-transform", open && "rotate-180")}
            />
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1">
        <TrackList detail={detail} songId={songId} />
      </CollapsibleContent>
    </Collapsible>
  )
}
