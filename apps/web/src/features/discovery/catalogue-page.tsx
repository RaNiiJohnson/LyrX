import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@lyrx/ui/components/field"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@lyrx/ui/components/toggle-group"
import { cn } from "@lyrx/ui/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@lyrx/ui/components/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lyrx/ui/components/select"
import { useLocale } from "@/app/locale-provider"
import { SONG_GENRES } from "@/features/catalogue/lib/catalogue-form"
import { AlbumCard, ArtistCard, SongCard } from "./discovery-cards"
import { DiscoveryEmpty, DiscoveryLoading } from "./discovery-states"
import {
  changeCatalogueFilter,
  genreMessageKeys,
  visiblePages,
  type CatalogueSearch,
} from "./catalogue-search"

export type CatalogueKind = "songs" | "albums" | "artists"
export function CataloguePage({
  kind,
  search,
  onSearch,
}: {
  kind: CatalogueKind
  search: CatalogueSearch
  onSearch: (search: CatalogueSearch) => void
}) {
  return kind === "songs" ? (
    <Songs search={search} onSearch={onSearch} />
  ) : kind === "albums" ? (
    <Albums search={search} onSearch={onSearch} />
  ) : (
    <Artists search={search} onSearch={onSearch} />
  )
}

function CatalogueLayout({
  kind,
  search,
  onSearch,
  total,
  children,
}: ResultsProps & {
  kind: CatalogueKind
  total: number | undefined
  children: ReactNode
}) {
  const { t } = useLocale()
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{t(`discovery.${kind}`)}</h1>
        {total === undefined ? (
          <Skeleton className="h-5 w-28" aria-hidden="true" />
        ) : (
          <ResultsCount kind={kind} total={total} />
        )}
        {search.artist ? (
          <p className="text-sm text-muted-foreground">@{search.artist}</p>
        ) : null}
      </header>
      <nav
        aria-label={t("discovery.catalogue")}
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {(["songs", "albums", "artists"] as const).map((entry) => (
          <Link
            key={entry}
            to={`/${entry}`}
            search={{ page: 1, sort: "newest" }}
            aria-current={kind === entry ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center border-b-2 border-transparent px-3 py-3 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:px-5",
              kind === entry && "border-primary font-medium text-foreground"
            )}
          >
            {t(`discovery.${entry}`)}
          </Link>
        ))}
      </nav>
      <FieldGroup className="flex-row flex-wrap items-center gap-3">
        {kind === "songs" && !search.artist ? (
          <>
            <Field className="w-full min-w-0 sm:w-auto">
              <FieldLabel className="sr-only">
                {t("discovery.origin")}
              </FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                value={search.origin ?? "all"}
                aria-label={t("discovery.origin")}
                onValueChange={(value) => {
                  if (
                    value === "all" ||
                    value === "artist" ||
                    value === "community"
                  )
                    onSearch(
                      changeCatalogueFilter(search, {
                        origin: value === "all" ? undefined : value,
                      })
                    )
                }}
              >
                <ToggleGroupItem value="all">
                  {t("catalogue.all")}
                </ToggleGroupItem>
                <ToggleGroupItem value="artist">
                  {t("discovery.sourceArtist")}
                </ToggleGroupItem>
                <ToggleGroupItem value="community">
                  {t("discovery.sourceCommunity")}
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Field className="min-w-0 flex-1 sm:grow-0 sm:basis-44">
              <FieldLabel className="sr-only">
                {t("discovery.genre")}
              </FieldLabel>
              <Select
                value={search.genre ?? "all"}
                onValueChange={(value) =>
                  onSearch(
                    changeCatalogueFilter(search, {
                      genre: SONG_GENRES.find((genre) => genre === value),
                    })
                  )
                }
              >
                <SelectTrigger
                  aria-label={t("discovery.genre")}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">
                      {t("discovery.allGenres")}
                    </SelectItem>
                    {SONG_GENRES.map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {t(genreMessageKeys[genre])}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </>
        ) : null}
        <Field className="min-w-0 flex-1 sm:ml-auto sm:grow-0 sm:basis-48">
          <FieldLabel className="sr-only">{t("discovery.sort")}</FieldLabel>
          <Select
            value={search.sort}
            onValueChange={(value) =>
              onSearch(
                changeCatalogueFilter(search, {
                  sort: value as CatalogueSearch["sort"],
                })
              )
            }
          >
            <SelectTrigger aria-label={t("discovery.sort")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="newest">
                  {t("discovery.sortNewest")}
                </SelectItem>
                <SelectItem value="title">
                  {t("discovery.sortTitle")}
                </SelectItem>
                {kind === "songs" ? (
                  <SelectItem value="popular">
                    {t("discovery.sortPopular")}
                  </SelectItem>
                ) : null}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      {children}
    </section>
  )
}
type ResultsProps = {
  search: CatalogueSearch
  onSearch: (search: CatalogueSearch) => void
}
function Songs({ search, onSearch }: ResultsProps) {
  const data = useQuery(api.discovery.read.listSongs, {
    page: search.page,
    sort: search.sort,
    origin: search.artist ? "artist" : search.origin,
    genre: search.artist ? undefined : search.genre,
    artistHandle: search.artist,
  })
  return (
    <CatalogueLayout
      kind="songs"
      search={search}
      onSearch={onSearch}
      total={data?.ready ? data.total : undefined}
    >
      {!data?.ready ? (
        <DiscoveryLoading />
      ) : data.items.length ? (
        <div className="grid gap-x-4 sm:grid-cols-2 sm:gap-y-4 lg:grid-cols-3">
          {data.items.map((song) => (
            <SongCard key={`${song.origin}:${song.id}`} song={song} />
          ))}
        </div>
      ) : (
        <DiscoveryEmpty />
      )}
      {data?.ready ? (
        <CataloguePagination
          {...data}
          onPage={(page) => onSearch({ ...search, page })}
        />
      ) : null}
    </CatalogueLayout>
  )
}
function Albums({ search, onSearch }: ResultsProps) {
  const data = useQuery(api.discovery.read.listAlbums, {
    page: search.page,
    sort: search.sort === "popular" ? "newest" : search.sort,
    artistHandle: search.artist,
  })
  return (
    <CatalogueLayout
      kind="albums"
      search={search}
      onSearch={onSearch}
      total={data?.ready ? data.total : undefined}
    >
      {!data?.ready ? (
        <DiscoveryLoading />
      ) : data.items.length ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      ) : (
        <DiscoveryEmpty />
      )}
      {data?.ready ? (
        <CataloguePagination
          {...data}
          onPage={(page) => onSearch({ ...search, page })}
        />
      ) : null}
    </CatalogueLayout>
  )
}
function Artists({ search, onSearch }: ResultsProps) {
  const data = useQuery(api.discovery.read.listArtists, {
    page: search.page,
    sort: search.sort === "popular" ? "newest" : search.sort,
  })
  return (
    <CatalogueLayout
      kind="artists"
      search={search}
      onSearch={onSearch}
      total={data?.ready ? data.total : undefined}
    >
      {!data?.ready ? (
        <DiscoveryLoading />
      ) : data.items.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {data.items.map((artist) => (
            <ArtistCard key={artist.handle} artist={artist} />
          ))}
        </div>
      ) : (
        <DiscoveryEmpty />
      )}
      {data?.ready ? (
        <CataloguePagination
          {...data}
          onPage={(page) => onSearch({ ...search, page })}
        />
      ) : null}
    </CatalogueLayout>
  )
}

function ResultsCount({ kind, total }: { kind: CatalogueKind; total: number }) {
  const { t, locale } = useLocale()
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {t(`discovery.${kind}Count`, { count: total.toLocaleString(locale) })}
    </p>
  )
}

export function CataloguePagination({
  page,
  pageCount,
  onPage,
}: {
  page: number
  pageCount: number
  onPage: (page: number) => void
}) {
  const { t } = useLocale()
  if (pageCount <= 1) return null
  const pages = visiblePages(page, pageCount)
  return (
    <Pagination aria-label={t("discovery.pagination")}>
      <PaginationContent className="flex-wrap">
        <PaginationItem>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("discovery.previous")}
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ArrowLeft />
          </Button>
        </PaginationItem>
        {pages.map((value, index) => (
          <PaginationItem key={value} className="flex items-center">
            {index > 0 && value > (pages[index - 1] ?? 0) + 1 ? (
              <PaginationEllipsis />
            ) : null}
            <PaginationLink asChild isActive={value === page}>
              <button
                type="button"
                aria-label={`${t("discovery.page")} ${value}`}
                onClick={() => onPage(value)}
              >
                {value}
              </button>
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("discovery.next")}
            disabled={page >= pageCount}
            onClick={() => onPage(page + 1)}
          >
            <ArrowRight />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
