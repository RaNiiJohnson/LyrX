import { Link } from "@tanstack/react-router"
import { usePaginatedQuery } from "convex/react"
import { Disc3, FileMusic, Plus } from "lucide-react"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lyrx/ui/components/empty"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lyrx/ui/components/tabs"

import { useLocale } from "@/app/locale-provider"
import { CatalogueListSkeleton } from "@/features/catalogue/shared/catalogue-loading"
import { AlbumCard, SongCard } from "./catalogue-item-card"

export function CatalogueDashboard() {
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
              <Link to="/studio/songs/new" search={{ albumId: undefined }}>
                <Plus /> {t("studio.newSong")}
              </Link>
            </Button>
          </div>
          <CatalogueListState
            loading={songs.status === "LoadingFirstPage"}
            empty={songs.results.length === 0}
            kind="song"
          >
            {songs.results.map((song) => (
              <SongCard key={song._id} song={song} />
            ))}
          </CatalogueListState>
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
          <CatalogueListState
            loading={albums.status === "LoadingFirstPage"}
            empty={albums.results.length === 0}
            kind="album"
          >
            {albums.results.map((album) => (
              <AlbumCard key={album._id} album={album} />
            ))}
          </CatalogueListState>
          <CatalogueLoadMore
            status={albums.status}
            onLoadMore={() => albums.loadMore(24)}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}

function CatalogueListState({
  children,
  empty,
  kind,
  loading,
}: {
  children: React.ReactNode
  empty: boolean
  kind: "song" | "album"
  loading: boolean
}) {
  const { t } = useLocale()
  if (loading) return <CatalogueListSkeleton />
  if (!empty) return <div className="grid gap-4 md:grid-cols-2">{children}</div>
  const song = kind === "song"
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {song ? <FileMusic /> : <Disc3 />}
        </EmptyMedia>
        <EmptyTitle>
          {t(song ? "studio.emptySongs" : "studio.emptyAlbums")}
        </EmptyTitle>
        <EmptyDescription>
          {t(
            song
              ? "studio.emptySongsDescription"
              : "studio.emptyAlbumsDescription"
          )}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to={song ? "/studio/songs/new" : "/studio/albums/new"}>
            <Plus /> {t(song ? "studio.newSong" : "studio.newAlbum")}
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function CatalogueLoadMore({
  onLoadMore,
  status,
}: {
  onLoadMore: () => void
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted"
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
