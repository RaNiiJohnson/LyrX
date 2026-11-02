import { Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex-helpers/react/cache"
import { useMutation } from "convex/react"
import {
  ArrowLeft,
  ExternalLink,
  EyeOff,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from "lucide-react"
import { useState } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lyrx/ui/components/alert-dialog"
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
import { toast } from "@lyrx/ui/lib/toast"

import { useLocale } from "@/app/locale-provider"
import { useCatalogueArtworkUpload } from "@/features/catalogue/hooks/use-catalogue-artwork-upload"
import { PreviewSkeleton } from "@/features/catalogue/shared/preview-skeleton"
import { usePublicationControl } from "@/features/catalogue/studio/use-publication-control"
import { SongInteractions } from "@/features/interactions/song-interactions"
import { getErrorMessage } from "@/lib/errors"
import { SongReadOnly } from "./song-read-only"

export function SongPreview({
  fromAlbumId,
  songId,
}: {
  fromAlbumId?: Id<"albums">
  songId: Id<"songs">
}) {
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
  return <ReadySongPreview songId={songId} fromAlbumId={fromAlbumId} />
}

function ReadySongPreview({
  fromAlbumId,
  songId,
}: {
  fromAlbumId?: Id<"albums">
  songId: Id<"songs">
}) {
  const [deleting, setDeleting] = useState(false)
  const detail = useQuery(
    api.catalogue.read.getMySong,
    deleting ? "skip" : { songId }
  )
  const { t } = useLocale()
  const navigate = useNavigate()
  const deleteSong = useMutation(api.catalogue.songs.deleteSong)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [artworkError, setArtworkError] = useState<string | null>(null)
  const artwork = useCatalogueArtworkUpload(
    { kind: "song", id: songId },
    setArtworkError
  )
  const publication = usePublicationControl(
    { kind: "song", id: songId },
    detail?.song.status ?? "draft"
  )
  if (detail === undefined) return <PreviewSkeleton />
  const published = detail.song.status === "published"

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteSong({ songId })
    } catch (caught) {
      toast.error(t("catalogue.saveError"), {
        description: getErrorMessage(caught, t),
      })
      setDeleting(false)
      return
    }
    toast.success(t("catalogue.deleted"))
    try {
      if (fromAlbumId) {
        await navigate({
          to: "/studio/albums/$albumId/preview",
          params: { albumId: fromAlbumId },
        })
      } else {
        await navigate({ to: "/studio", search: { tab: "songs" } })
      }
    } catch {
      // The resource is already deleted: never resubscribe to its detail when
      // client navigation fails. Fall back to a fresh document at the target.
      window.location.assign(
        fromAlbumId
          ? `/studio/albums/${encodeURIComponent(fromAlbumId)}/preview`
          : "/studio?tab=songs"
      )
    }
  }

  return (
    <>
      <SongReadOnly
        detail={detail}
        artworkAction={{
          pending: artwork.pending,
          onSelect: (file) => void artwork.uploadArtwork(file),
        }}
        notice={
          <>
            <Alert className={published ? undefined : "border-primary/40"}>
              <AlertTitle>
                {published
                  ? t("studio.publishedBannerTitle")
                  : t("studio.draftBannerTitle")}
              </AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <p>
                  {published
                    ? t("studio.publishedBannerDescription")
                    : t("studio.draftBannerDescription")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {published ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/songs/$songId" params={{ songId }}>
                        <ExternalLink data-icon="inline-start" />
                        {t("studio.viewPublicPage")}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={publication.pending}
                      onClick={() => void publication.changeStatus()}
                    >
                      <Send data-icon="inline-start" />
                      {t("catalogue.publish")}
                    </Button>
                  )}
                </div>
                {publication.error ? <p>{publication.error}</p> : null}
              </AlertDescription>
            </Alert>
            {artworkError ? (
              <Alert variant="destructive">
                <AlertTitle>{t("catalogue.uploadError")}</AlertTitle>
                <AlertDescription>{artworkError}</AlertDescription>
              </Alert>
            ) : null}
          </>
        }
        actions={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link
                  to={
                    fromAlbumId ? "/studio/albums/$albumId/preview" : "/studio"
                  }
                  params={fromAlbumId ? { albumId: fromAlbumId } : undefined}
                  search={fromAlbumId ? undefined : { tab: "songs" }}
                >
                  <ArrowLeft data-icon="inline-start" /> {t("common.back")}
                </Link>
              </Button>
              <Badge variant={published ? "default" : "secondary"}>
                {published ? t("catalogue.published") : t("catalogue.draft")}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/studio/songs/$songId"
                  params={{ songId }}
                  search={{ fromAlbumId }}
                >
                  <Pencil data-icon="inline-start" /> {t("catalogue.edit")}
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="border-0"
                    aria-label={t("catalogue.moreActions")}
                    title={t("catalogue.moreActions")}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/studio/songs/$songId"
                        params={{ songId }}
                        search={{ fromAlbumId }}
                      >
                        <Pencil /> {t("catalogue.edit")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={publication.pending}
                      onSelect={() => void publication.changeStatus()}
                    >
                      {published ? <EyeOff /> : <Send />}
                      {published
                        ? t("catalogue.unpublish")
                        : t("catalogue.publish")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleteOpen(true)}
                    >
                      <Trash2 /> {t("common.remove")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("catalogue.deleteSongTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("catalogue.deleteSongDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>
                      {t("common.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={deleting}
                      onClick={(event) => {
                        event.preventDefault()
                        void handleDelete()
                      }}
                    >
                      {t("common.remove")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        }
      />
      {published ? (
        <SongInteractions key={songId} sourceId={songId} />
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
          {t("studio.commentsAfterPublish")}
        </p>
      )}
    </>
  )
}
