import { getRouteApi, Link, useNavigate } from "@tanstack/react-router"
import { usePaginatedQuery } from "convex/react"
import { Disc3, FileMusic, Plus } from "lucide-react"
import { useState } from "react"

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
import { ToggleGroup, ToggleGroupItem } from "@lyrx/ui/components/toggle-group"

import { useLocale } from "@/app/locale-provider"
import { CatalogueListSkeleton } from "@/features/catalogue/shared/catalogue-loading"
import { AlbumCard, SongCard } from "./catalogue-item-card"

const studioRoute = getRouteApi("/studio/")
type CatalogueKind = "songs" | "albums"
type StatusFilter = "all" | "draft" | "published"

export function CatalogueDashboard() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const { tab } = studioRoute.useSearch()
  const activeKind: CatalogueKind = tab === "albums" ? "albums" : "songs"
  const [status, setStatus] = useState<StatusFilter>("all")
  const queryArgs = status === "all" ? {} : { status }
  const songs = usePaginatedQuery(api.catalogue.read.listMySongs, queryArgs, {
    initialNumItems: 24,
  })
  const albums = usePaginatedQuery(api.catalogue.read.listMyAlbums, queryArgs, {
    initialNumItems: 24,
  })

  return (
    <section className="flex h-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-primary uppercase">
          {t("home.eyebrow")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("studio.title")}
        </h1>
      </div>
      <Tabs
        value={activeKind}
        className="w-full flex-1"
        onValueChange={(value) =>
          void navigate({
            to: "/studio",
            search: { tab: value === "albums" ? "albums" : "songs" },
          })
        }
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList
            className="grid h-11 w-full grid-cols-2 lg:max-w-sm"
            aria-label={t("studio.title")}
          >
            <TabsTrigger value="songs">
              <FileMusic /> {t("studio.songs")}
            </TabsTrigger>
            <TabsTrigger value="albums">
              <Disc3 /> {t("studio.albums")}
            </TabsTrigger>
          </TabsList>
          <CreateButton kind={activeKind === "albums" ? "album" : "song"} />
        </div>

        <StatusFilters value={status} onChange={setStatus} />

        <TabsContent value="songs" className="flex flex-col gap-4 pt-1">
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
        <TabsContent value="albums" className="flex flex-col gap-4 pt-1">
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

function StatusFilters({
  onChange,
  value,
}: {
  onChange: (value: StatusFilter) => void
  value: StatusFilter
}) {
  const { t } = useLocale()
  const options = [
    { label: t("catalogue.all"), value: "all" },
    { label: t("catalogue.drafts"), value: "draft" },
    { label: t("catalogue.publishedPlural"), value: "published" },
  ] as const
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(next) => {
        if (next === "all" || next === "draft" || next === "published")
          onChange(next)
      }}
      className="max-w-full flex-wrap py-3"
      aria-label={t("catalogue.filterByStatus")}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function CreateButton({ kind }: { kind: "song" | "album" }) {
  const { t } = useLocale()
  const song = kind === "song"
  return (
    <Button asChild className="w-full lg:w-auto">
      <Link
        to={song ? "/studio/songs/new" : "/studio/albums/new"}
        search={song ? { albumId: undefined } : undefined}
      >
        <Plus data-icon="inline-start" />
        {t(song ? "studio.newSong" : "studio.newAlbum")}
      </Link>
    </Button>
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
  if (!empty) return <div className="flex flex-col border-t">{children}</div>
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
