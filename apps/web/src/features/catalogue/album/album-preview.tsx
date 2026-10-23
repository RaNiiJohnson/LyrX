import { Link, useNavigate } from "@tanstack/react-router"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import {
  ArrowLeft,
  ChevronDown,
  Disc3,
  FileMusic,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"

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
  return <ReadyAlbumPreview albumId={albumId} />
}

function ReadyAlbumPreview({ albumId }: { albumId: Id<"albums"> }) {
  const detail = useQuery(api.catalogue.getMyAlbum, { albumId })
  const songs = usePaginatedQuery(
    api.catalogue.listMySongs,
    {},
    { initialNumItems: 50 }
  )
  const deleteAlbum = useMutation(api.catalogue.deleteAlbum)
  const attachSong = useMutation(api.catalogue.attachSongToAlbum)
  const navigate = useNavigate()
  const { locale, t } = useLocale()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [attachingSongId, setAttachingSongId] = useState<Id<"songs">>()

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
          label: "Langue principale",
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
      toast.success("Album supprimé")
      await navigate({ to: "/studio" })
    } catch (caught) {
      toast.error(t("catalogue.saveError"), {
        description: getErrorMessage(caught, t),
      })
      setDeleting(false)
    }
  }

  async function handleAttach(songId: Id<"songs">) {
    setAttachingSongId(songId)
    try {
      await attachSong({
        albumId,
        songId,
        inheritance: preserveExistingSong,
      })
      toast.success("Morceau ajouté à l’album")
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
            <Link to="/studio">
              <ArrowLeft data-icon="inline-start" /> {t("common.back")}
            </Link>
          </Button>
          <Badge variant="outline">{t("catalogue.preview")}</Badge>
        </div>
        <AlbumActions albumId={albumId} onDelete={() => setDeleteOpen(true)} />
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet album ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les morceaux seront conservés comme singles. Les informations
              héritées de l’album seront copiées avant sa suppression.
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

      <header className="flex min-w-0 items-end gap-4 sm:gap-6">
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
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Album
            </p>
            <Badge variant="secondary">
              {t(
                detail.album.status === "published"
                  ? "catalogue.published"
                  : "catalogue.draft"
              )}
            </Badge>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {detail.album.title}
          </h1>
          {detail.album.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {detail.album.description}
            </p>
          ) : null}
        </div>
      </header>

      <AlbumDetails
        items={metadata}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <section className="flex flex-col gap-4" aria-labelledby="album-tracks">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="album-tracks" className="text-xl font-semibold">
              Morceaux
            </h2>
            <p className="text-sm text-muted-foreground">
              Seuls les morceaux publiés apparaîtront sur la page publique.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectorOpen((open) => !open)}
              aria-expanded={selectorOpen}
            >
              <Link2 data-icon="inline-start" /> Rattacher un morceau
            </Button>
            <Button asChild>
              <Link to="/studio/songs/new" search={{ albumId }}>
                <Plus data-icon="inline-start" /> Créer un morceau
              </Link>
            </Button>
          </div>
        </div>

        <Collapsible open={selectorOpen} onOpenChange={setSelectorOpen}>
          <CollapsibleContent>
            <Card>
              <CardHeader>
                <CardTitle>Rattacher un single existant</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="album-song-search">
                    Rechercher un morceau
                  </FieldLabel>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="album-song-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="pl-8"
                      placeholder="Titre ou artiste"
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
                            ? "Ajout…"
                            : "Rattacher"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun single disponible ne correspond à cette recherche.
                  </p>
                )}
                {songs.status === "CanLoadMore" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => songs.loadMore(50)}
                  >
                    Charger plus de morceaux
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
              <EmptyTitle>Cet album n’a pas encore de morceau</EmptyTitle>
              <EmptyDescription>
                Rattachez un single existant ou créez un nouveau morceau déjà
                lié à cet album.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectorOpen(true)}
              >
                <Link2 data-icon="inline-start" /> Rattacher un morceau
              </Button>
              <Button asChild>
                <Link to="/studio/songs/new" search={{ albumId }}>
                  <Plus data-icon="inline-start" /> Créer pour cet album
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ol className="flex flex-col gap-2">
            {detail.tracks.map(({ track, song }) => (
              <li key={track._id}>
                <Link
                  to="/studio/songs/$songId/preview"
                  params={{ songId: song._id }}
                  className="flex min-h-16 items-center gap-4 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="w-7 shrink-0 text-center font-mono text-sm text-muted-foreground">
                    {track.position + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{song.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {song.primaryArtist}
                    </p>
                  </div>
                  <Badge
                    variant={
                      song.status === "published" ? "default" : "secondary"
                    }
                  >
                    {t(
                      song.status === "published"
                        ? "catalogue.published"
                        : "catalogue.draft"
                    )}
                  </Badge>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  )
}

function AlbumActions({
  albumId,
  onDelete,
}: {
  albumId: Id<"albums">
  onDelete: () => void
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
              <CardTitle>Détails de l’album</CardTitle>
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
