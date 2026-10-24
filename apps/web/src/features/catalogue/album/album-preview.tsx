import { Link, useNavigate } from "@tanstack/react-router"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Disc3,
  FileMusic,
  GripVertical,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lyrx/ui/components/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lyrx/ui/components/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lyrx/ui/components/empty"
import { Field, FieldLabel } from "@lyrx/ui/components/field"
import { Input } from "@lyrx/ui/components/input"
import { toast } from "@lyrx/ui/lib/toast"

import { useLocale } from "@/app/locale-provider"
import { PreviewSkeleton } from "@/features/catalogue/shared/preview-skeleton"
import { getErrorMessage } from "@/lib/errors"
import { usePublicationControl } from "@/features/catalogue/studio/use-publication-control"

type AlbumTrack = NonNullable<
  FunctionReturnType<typeof api.catalogue.getMyAlbum>
>["tracks"][number]

const preserveExistingSong = {
  inheritArtwork: false,
  inheritPrimaryLanguage: false,
  inheritGenre: false,
  inheritLabel: false,
  inheritCredits: false,
} as const

export function AlbumPreview({ albumId }: { albumId: Id<"albums"> }) {
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
  return (
    <ReadyAlbumPreview
      albumId={albumId}
      artistName={current.profile.displayName}
    />
  )
}

function ReadyAlbumPreview({
  albumId,
  artistName,
}: {
  albumId: Id<"albums">
  artistName: string
}) {
  const detail = useQuery(api.catalogue.getMyAlbum, { albumId })
  const songs = usePaginatedQuery(
    api.catalogue.listMySongs,
    {},
    { initialNumItems: 50 }
  )
  const deleteAlbum = useMutation(api.catalogue.deleteAlbum)
  const attachSong = useMutation(api.catalogue.attachSongToAlbum)
  const reorderTracks = useMutation(api.catalogue.reorderAlbumTracks)
  const navigate = useNavigate()
  const { locale, t } = useLocale()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [attachingSongId, setAttachingSongId] = useState<Id<"songs">>()
  const [orderedTracks, setOrderedTracks] = useState<Array<AlbumTrack>>([])
  const [savingOrder, setSavingOrder] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const publication = usePublicationControl(
    { kind: "album", id: albumId },
    detail?.album.status ?? "draft"
  )

  useEffect(() => {
    if (!savingOrder && detail) setOrderedTracks(detail.tracks)
  }, [detail, savingOrder])

  const availableSongs = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(locale)
    return songs.results.filter(
      (song) =>
        song.albumId === null &&
        (normalizedSearch.length === 0 ||
          song.title.toLocaleLowerCase(locale).includes(normalizedSearch) ||
          song.primaryArtist
            .toLocaleLowerCase(locale)
            .includes(normalizedSearch))
    )
  }, [locale, search, songs.results])

  if (detail === undefined) return <PreviewSkeleton />

  const metadata = [
    detail.album.releaseDate === undefined
      ? undefined
      : {
          id: "releaseDate",
          label: t("studio.releaseDate"),
          value: new Intl.DateTimeFormat(locale, {
            dateStyle: "long",
            timeZone: "UTC",
          }).format(detail.album.releaseDate),
        },
    detail.album.primaryLanguage
      ? {
          id: "language",
          label: t("studio.language"),
          value: detail.album.primaryLanguage,
        }
      : undefined,
    detail.album.genre
      ? {
          id: "genre",
          label: t("studio.genre"),
          value:
            detail.album.genre === "other"
              ? (detail.album.otherGenre ?? detail.album.genre)
              : detail.album.genre,
        }
      : undefined,
    detail.album.label
      ? { id: "label", label: t("studio.label"), value: detail.album.label }
      : undefined,
    detail.album.credits.length > 0
      ? {
          id: "credits",
          label: t("studio.albumCredits"),
          value: detail.album.credits.join(", "),
        }
      : undefined,
  ].filter(
    (item): item is { id: string; label: string; value: string } =>
      item !== undefined
  )

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteAlbum({ albumId })
      toast.success(t("studio.albumDeleted"))
      await navigate({ to: "/studio", search: { tab: "albums" } })
    } catch (caught) {
      toast.error(t("catalogue.saveError"), {
        description: getErrorMessage(caught, t),
      })
      setDeleting(false)
    }
  }

  async function saveTrackOrder(next: Array<AlbumTrack>) {
    if (savingOrder) return
    const previous = orderedTracks
    setOrderedTracks(next)
    setSavingOrder(true)
    try {
      await reorderTracks({
        albumId,
        songIds: next.map(({ song }) => song._id),
      })
      toast.success(t("studio.trackOrderSaved"))
    } catch (caught) {
      setOrderedTracks(previous)
      toast.error(t("catalogue.saveError"), {
        description: getErrorMessage(caught, t),
      })
    } finally {
      setSavingOrder(false)
    }
  }

  function moveTrack(from: number, to: number) {
    if (to < 0 || to >= orderedTracks.length || from === to) return
    const next = [...orderedTracks]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    void saveTrackOrder(next)
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const from = orderedTracks.findIndex(
      ({ song }) => song._id === event.active.id
    )
    const to = orderedTracks.findIndex(
      ({ song }) => song._id === event.over?.id
    )
    if (from !== -1 && to !== -1) moveTrack(from, to)
  }

  async function handleAttach(songId: Id<"songs">) {
    setAttachingSongId(songId)
    try {
      await attachSong({
        albumId,
        songId,
        inheritance: preserveExistingSong,
      })
      toast.success(t("studio.songAttached"))
      setSearch("")
      setSelectorOpen(false)
    } catch (caught) {
      toast.error(t("catalogue.saveError"), {
        description: getErrorMessage(caught, t),
      })
    } finally {
      setAttachingSongId(undefined)
    }
  }

  return (
    <article className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/studio" search={{ tab: "albums" }}>
              <ArrowLeft data-icon="inline-start" /> {t("common.back")}
            </Link>
          </Button>
          <Badge variant="outline">{t("catalogue.preview")}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {detail.album.status === "draft" ? (
            <Button
              type="button"
              disabled={publication.pending}
              onClick={() => void publication.changeStatus()}
            >
              {t("catalogue.publish")}
            </Button>
          ) : null}
          <AlbumActions
            albumId={albumId}
            isPublished={detail.album.status === "published"}
            onDelete={() => setDeleteOpen(true)}
            onUnpublish={() => void publication.changeStatus()}
          />
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("studio.deleteAlbumTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("studio.deleteAlbumDescription")}
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

      {publication.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t("catalogue.saveError")}</AlertTitle>
          <AlertDescription>{publication.error}</AlertDescription>
        </Alert>
      ) : null}

      <header className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] items-end gap-4 sm:grid-cols-[8.25rem_minmax(0,1fr)] sm:gap-6">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted text-muted-foreground sm:size-[8.25rem]">
          {detail.artworkUrl ? (
            <img
              src={detail.artworkUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <Disc3 className="size-9" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-medium tracking-[0.18em] text-primary uppercase">
              {t("studio.albumByArtist", { artist: artistName })}
            </p>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {detail.album.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">
              {t("studio.trackCount", { count: detail.trackCount })}
            </Badge>
            {detail.album.releaseDate !== undefined ? (
              <Badge variant="outline">
                {new Intl.DateTimeFormat(locale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(detail.album.releaseDate)}
              </Badge>
            ) : null}
            <Badge variant="secondary">
              {t(
                detail.album.status === "published"
                  ? "catalogue.published"
                  : "catalogue.draft"
              )}
            </Badge>
          </div>
        </div>
        {detail.album.description ? (
          <p className="col-span-2 text-sm leading-6 text-muted-foreground sm:col-start-2 sm:max-w-2xl sm:text-base">
            {detail.album.description}
          </p>
        ) : null}
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="album-tracks">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="album-tracks" className="text-xl font-semibold">
            {t("studio.tracks")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectorOpen((open) => !open)}
              aria-expanded={selectorOpen}
            >
              <Link2 data-icon="inline-start" /> {t("studio.attachSong")}
            </Button>
            <Button asChild>
              <Link to="/studio/songs/new" search={{ albumId }}>
                <Plus data-icon="inline-start" /> {t("studio.createSong")}
              </Link>
            </Button>
          </div>
        </div>

        <Collapsible open={selectorOpen} onOpenChange={setSelectorOpen}>
          <CollapsibleContent>
            <Card>
              <CardHeader>
                <CardTitle>{t("studio.attachExistingSong")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="album-song-search">
                    {t("studio.searchSong")}
                  </FieldLabel>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="album-song-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="pl-8"
                      placeholder={t("studio.searchSongPlaceholder")}
                    />
                  </div>
                </Field>
                {availableSongs.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {availableSongs.map((song) => (
                      <div
                        key={song._id}
                        className="flex min-w-0 items-center justify-between gap-3 rounded-xl border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{song.title}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {song.primaryArtist}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={attachingSongId !== undefined}
                          onClick={() => void handleAttach(song._id)}
                        >
                          {attachingSongId === song._id
                            ? t("studio.attaching")
                            : t("studio.attach")}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("studio.noMatchingSingles")}
                  </p>
                )}
                {songs.status === "CanLoadMore" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => songs.loadMore(50)}
                  >
                    {t("studio.loadMoreSongs")}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {detail.tracks.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileMusic />
              </EmptyMedia>
              <EmptyTitle>{t("studio.emptyAlbumTitle")}</EmptyTitle>
              <EmptyDescription>
                {t("studio.emptyAlbumDescription")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectorOpen(true)}
              >
                <Link2 data-icon="inline-start" /> {t("studio.attachSong")}
              </Button>
              <Button asChild>
                <Link to="/studio/songs/new" search={{ albumId }}>
                  <Plus data-icon="inline-start" />
                  {t("studio.createForAlbum")}
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedTracks.map(({ song }) => song._id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="flex flex-col border-y">
                {orderedTracks.map((row, index) => (
                  <SortableAlbumTrack
                    key={row.song._id}
                    row={row}
                    index={index}
                    albumId={albumId}
                    disabled={savingOrder}
                    isFirst={index === 0}
                    isLast={index === orderedTracks.length - 1}
                    onMoveUp={() => moveTrack(index, index - 1)}
                    onMoveDown={() => moveTrack(index, index + 1)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <AlbumDetails
        items={metadata}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </article>
  )
}

function SortableAlbumTrack({
  albumId,
  disabled,
  index,
  isFirst,
  isLast,
  onMoveDown,
  onMoveUp,
  row,
}: {
  albumId: Id<"albums">
  disabled: boolean
  index: number
  isFirst: boolean
  isLast: boolean
  onMoveDown: () => void
  onMoveUp: () => void
  row: AlbumTrack
}) {
  const { t } = useLocale()
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: row.song._id, disabled })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-dragging={isDragging}
      className="grid min-h-16 grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-1 border-b bg-background py-2 last:border-b-0 data-[dragging=true]:z-10 data-[dragging=true]:rounded-xl data-[dragging=true]:shadow-lg sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto] sm:gap-2"
    >
      <Button
        ref={setActivatorNodeRef}
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        className="cursor-grab touch-none active:cursor-grabbing"
        aria-label={t("studio.dragTrack", { title: row.song.title })}
        {...attributes}
        {...listeners}
      >
        <GripVertical />
      </Button>
      <span className="w-6 text-center font-mono text-sm text-muted-foreground">
        {index + 1}
      </span>
      <Link
        to="/studio/songs/$songId/preview"
        params={{ songId: row.song._id }}
        search={{ fromAlbumId: albumId }}
        className="min-w-0 rounded-md px-2 py-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <p className="truncate font-medium">{row.song.title}</p>
        <p className="truncate text-sm text-muted-foreground">
          {row.song.primaryArtist}
        </p>
      </Link>
      <Badge
        className="hidden sm:inline-flex"
        variant={row.song.status === "published" ? "default" : "secondary"}
      >
        {t(
          row.song.status === "published"
            ? "catalogue.published"
            : "catalogue.draft"
        )}
      </Badge>
      <div className="flex flex-col items-center sm:flex-row">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 sm:size-8"
          disabled={disabled || isFirst}
          aria-label={t("catalogue.moveUp")}
          onClick={onMoveUp}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 sm:size-8"
          disabled={disabled || isLast}
          aria-label={t("catalogue.moveDown")}
          onClick={onMoveDown}
        >
          <ArrowDown />
        </Button>
      </div>
      <Link
        to="/studio/songs/$songId/preview"
        params={{ songId: row.song._id }}
        search={{ fromAlbumId: albumId }}
        aria-label={t("studio.openTrack", { title: row.song.title })}
        className="grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronRight />
      </Link>
    </li>
  )
}

function AlbumActions({
  albumId,
  isPublished,
  onDelete,
  onUnpublish,
}: {
  albumId: Id<"albums">
  isPublished: boolean
  onDelete: () => void
  onUnpublish: () => void
}) {
  const { t } = useLocale()
  return (
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
            <Link to="/studio/albums/$albumId" params={{ albumId }}>
              <Pencil /> {t("catalogue.edit")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {isPublished ? (
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={onUnpublish}>
              {t("catalogue.unpublish")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 /> {t("common.remove")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AlbumDetails({
  items,
  onOpenChange,
  open,
}: {
  items: Array<{ id: string; label: string; value: string }>
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { t } = useLocale()
  if (items.length === 0) return null
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="group w-full justify-between px-0"
            >
              <CardTitle>{t("studio.albumDetails")}</CardTitle>
              <ChevronDown
                className="transition-transform group-aria-expanded:rotate-180"
                aria-hidden="true"
              />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2">
              {items.map((item) => (
                <div key={item.id} className="flex min-w-0 flex-col gap-1">
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {item.label}
                  </dt>
                  <dd className="text-base wrap-break-word">{item.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
