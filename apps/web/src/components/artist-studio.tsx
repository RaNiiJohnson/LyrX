import { Link } from "@tanstack/react-router"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { Disc3, FileMusic, Plus } from "lucide-react"
import { useState } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Doc } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import { Checkbox } from "@lyrx/ui/components/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lyrx/ui/components/empty"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lyrx/ui/components/tabs"
import { toast } from "@lyrx/ui/lib/toast"

import { getErrorMessage } from "@/lib/errors"
import { useLocale } from "./locale-provider"

export function ArtistStudio() {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()

  if (current === undefined) return <ArtistStudioSkeleton />
  if (current.state !== "ready" || current.member.role !== "artist") {
    return (
      <Alert>
        <AlertTitle>{t("studio.notArtistTitle")}</AlertTitle>
        <AlertDescription>{t("studio.notArtistDescription")}</AlertDescription>
      </Alert>
    )
  }

  return <ReadyArtistStudio />
}

function ReadyArtistStudio() {
  const { t } = useLocale()
  const songs = usePaginatedQuery(
    api.catalogue.listMySongs,
    {},
    { initialNumItems: 24 }
  )
  const albums = usePaginatedQuery(
    api.catalogue.listMyAlbums,
    {},
    { initialNumItems: 24 }
  )

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-primary uppercase">
            {t("home.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("studio.title")}
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            {t("studio.description")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="songs" className="w-full">
        <TabsList
          variant="line"
          className="w-full justify-start border-b px-0"
          aria-label={t("studio.title")}
        >
          <TabsTrigger value="songs">
            <FileMusic /> {t("studio.songs")}
          </TabsTrigger>
          <TabsTrigger value="albums">
            <Disc3 /> {t("studio.albums")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="songs" className="space-y-4 pt-3">
          <div className="flex justify-end">
            <Button asChild>
              <Link to="/studio/songs/new">
                <Plus /> {t("studio.newSong")}
              </Link>
            </Button>
          </div>
          {songs.status === "LoadingFirstPage" ? (
            <CatalogueListSkeleton />
          ) : songs.results.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileMusic />
                </EmptyMedia>
                <EmptyTitle>{t("studio.emptySongs")}</EmptyTitle>
                <EmptyDescription>
                  {t("studio.emptySongsDescription")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link to="/studio/songs/new">
                    <Plus /> {t("studio.newSong")}
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {songs.results.map((song) => (
                <SongCard key={song._id} song={song} />
              ))}
            </div>
          )}
          <CatalogueLoadMore
            status={songs.status}
            onLoadMore={() => songs.loadMore(24)}
          />
        </TabsContent>
        <TabsContent value="albums" className="space-y-4 pt-3">
          <div className="flex justify-end">
            <Button asChild>
              <Link to="/studio/albums/new">
                <Plus /> {t("studio.newAlbum")}
              </Link>
            </Button>
          </div>
          {albums.status === "LoadingFirstPage" ? (
            <CatalogueListSkeleton />
          ) : albums.results.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Disc3 />
                </EmptyMedia>
                <EmptyTitle>{t("studio.emptyAlbums")}</EmptyTitle>
                <EmptyDescription>
                  {t("studio.emptyAlbumsDescription")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link to="/studio/albums/new">
                    <Plus /> {t("studio.newAlbum")}
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {albums.results.map((album) => (
                <AlbumCard key={album._id} album={album} />
              ))}
            </div>
          )}
          <CatalogueLoadMore
            status={albums.status}
            onLoadMore={() => albums.loadMore(24)}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}

function SongCard({ song }: { song: Doc<"songs"> }) {
  const { t } = useLocale()
  const publish = useMutation(api.catalogue.publishSong)
  const unpublish = useMutation(api.catalogue.unpublishSong)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)

  async function changeStatus() {
    setPending(true)
    setError(null)
    try {
      if (song.status === "draft") {
        if (!rightsConfirmed) return
        await publish({ songId: song._id, rightsConfirmed: true })
        setRightsConfirmed(false)
      } else await unpublish({ songId: song._id })
      toast.success(
        song.status === "draft"
          ? t("catalogue.publishedNotice")
          : t("catalogue.unpublishedNotice")
      )
    } catch (caught) {
      const message = getErrorMessage(caught, t)
      setError(message)
      toast.error(t("catalogue.saveError"), {
        description: message,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{song.title}</CardTitle>
            <CardDescription>{song.primaryArtist}</CardDescription>
          </div>
          <StatusBadge status={song.status} />
        </div>
      </CardHeader>
      {song.status === "draft" || error ? (
        <CardContent>
          <div className="space-y-4">
            {song.status === "draft" ? (
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                <Checkbox
                  checked={rightsConfirmed}
                  onCheckedChange={(checked) =>
                    setRightsConfirmed(checked === true)
                  }
                />
                <span>{t("catalogue.rightsConfirmation")}</span>
              </label>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{t("catalogue.saveError")}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      ) : null}
      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/studio/songs/$songId" params={{ songId: song._id }}>
            {t("catalogue.edit")}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link
            to="/studio/songs/$songId/preview"
            params={{ songId: song._id }}
          >
            {t("catalogue.preview")}
          </Link>
        </Button>
        <Button
          type="button"
          variant={song.status === "draft" ? "default" : "secondary"}
          size="sm"
          disabled={pending || (song.status === "draft" && !rightsConfirmed)}
          onClick={() => void changeStatus()}
        >
          {song.status === "draft"
            ? t("catalogue.publish")
            : t("catalogue.unpublish")}
        </Button>
      </CardFooter>
    </Card>
  )
}

function AlbumCard({ album }: { album: Doc<"albums"> }) {
  const { t } = useLocale()
  const publish = useMutation(api.catalogue.publishAlbum)
  const unpublish = useMutation(api.catalogue.unpublishAlbum)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)

  async function changeStatus() {
    setPending(true)
    setError(null)
    try {
      if (album.status === "draft") {
        if (!rightsConfirmed) return
        await publish({ albumId: album._id, rightsConfirmed: true })
        setRightsConfirmed(false)
      } else await unpublish({ albumId: album._id })
      toast.success(
        album.status === "draft"
          ? t("catalogue.publishedNotice")
          : t("catalogue.unpublishedNotice")
      )
    } catch (caught) {
      const message = getErrorMessage(caught, t)
      setError(message)
      toast.error(t("catalogue.saveError"), {
        description: message,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{album.title}</CardTitle>
          <StatusBadge status={album.status} />
        </div>
      </CardHeader>
      {album.status === "draft" || error ? (
        <CardContent>
          <div className="space-y-4">
            {album.status === "draft" ? (
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                <Checkbox
                  checked={rightsConfirmed}
                  onCheckedChange={(checked) =>
                    setRightsConfirmed(checked === true)
                  }
                />
                <span>{t("catalogue.rightsConfirmation")}</span>
              </label>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{t("catalogue.saveError")}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      ) : null}
      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/studio/albums/$albumId" params={{ albumId: album._id }}>
            {t("catalogue.edit")}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link
            to="/studio/albums/$albumId/preview"
            params={{ albumId: album._id }}
          >
            {t("catalogue.preview")}
          </Link>
        </Button>
        <Button
          type="button"
          variant={album.status === "draft" ? "default" : "secondary"}
          size="sm"
          disabled={pending || (album.status === "draft" && !rightsConfirmed)}
          onClick={() => void changeStatus()}
        >
          {album.status === "draft"
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

function CatalogueLoadMore({
  status,
  onLoadMore,
}: {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted"
  onLoadMore: () => void
}) {
  const { t } = useLocale()
  if (status === "LoadingFirstPage" || status === "Exhausted") return null
  return (
    <div className="flex justify-center">
      <Button
        type="button"
        variant="outline"
        disabled={status === "LoadingMore"}
        onClick={onLoadMore}
      >
        {status === "LoadingMore" ? t("common.loading") : t("common.loadMore")}
      </Button>
    </div>
  )
}

function ArtistStudioSkeleton() {
  const { t } = useLocale()
  return (
    <div aria-label={t("common.loadingCatalogue")} className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-8 w-52" />
      <CatalogueListSkeleton />
    </div>
  )
}

function CatalogueListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1].map((item) => (
        <Card key={item}>
          <CardHeader className="gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
