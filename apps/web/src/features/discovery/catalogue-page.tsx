import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@lyrx/ui/components/field"
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
  const { t } = useLocale()
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t(`discovery.${kind}`)}</h1>
      {search.artist ? (
        <p className="text-sm text-muted-foreground">@{search.artist}</p>
      ) : null}
      <nav
        className="flex flex-wrap gap-2"
        aria-label={t("discovery.catalogue")}
      >
        {(["songs", "albums", "artists"] as const).map((entry) => (
          <Button
            asChild
            variant={kind === entry ? "default" : "ghost"}
            key={entry}
          >
            <Link
              to={`/${entry}`}
              aria-current={entry === kind ? "page" : undefined}
            >
              {t(`discovery.${entry}`)}
            </Link>
          </Button>
        ))}
      </nav>
      <FieldGroup className="flex-row flex-wrap gap-3">
        <Field className="w-full sm:w-48">
          <FieldLabel>{t("discovery.sort")}</FieldLabel>
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
        {kind === "songs" && !search.artist ? (
          <>
            <Field className="w-full sm:w-48">
              <FieldLabel>{t("discovery.origin")}</FieldLabel>
              <Select
                value={search.origin ?? "all"}
                onValueChange={(value) =>
                  onSearch(
                    changeCatalogueFilter(search, {
                      origin:
                        value === "all"
                          ? undefined
                          : (value as CatalogueSearch["origin"]),
                    })
                  )
                }
              >
                <SelectTrigger
                  aria-label={t("discovery.origin")}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">
                      {t("discovery.allOrigins")}
                    </SelectItem>
                    <SelectItem value="artist">
                      {t("discovery.sourceArtist")}
                    </SelectItem>
                    <SelectItem value="community">
                      {t("discovery.sourceCommunity")}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field className="w-full sm:w-48">
              <FieldLabel>{t("discovery.genre")}</FieldLabel>
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
      </FieldGroup>
      {kind === "songs" ? (
        <Songs search={search} onSearch={onSearch} />
      ) : kind === "albums" ? (
        <Albums search={search} onSearch={onSearch} />
      ) : (
        <Artists search={search} onSearch={onSearch} />
      )}
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
  if (!data?.ready) return <DiscoveryLoading />
  return (
    <>
      <ResultsCount kind="songs" total={data.total} />
      {data.items.length ? (
        <div className="grid gap-x-4 sm:grid-cols-2 sm:gap-y-4 lg:grid-cols-3">
          {data.items.map((song) => (
            <SongCard key={`${song.origin}:${song.id}`} song={song} />
          ))}
        </div>
      ) : (
        <DiscoveryEmpty />
      )}
      <CataloguePagination
        {...data}
        onPage={(page) => onSearch({ ...search, page })}
      />
    </>
  )
}
function Albums({ search, onSearch }: ResultsProps) {
  const data = useQuery(api.discovery.read.listAlbums, {
    page: search.page,
    sort: search.sort === "popular" ? "newest" : search.sort,
    artistHandle: search.artist,
  })
  if (!data?.ready) return <DiscoveryLoading />
  return (
    <>
      <ResultsCount kind="albums" total={data.total} />
      {data.items.length ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      ) : (
        <DiscoveryEmpty />
      )}
      <CataloguePagination
        {...data}
        onPage={(page) => onSearch({ ...search, page })}
      />
    </>
  )
}
function Artists({ search, onSearch }: ResultsProps) {
  const data = useQuery(api.discovery.read.listArtists, {
    page: search.page,
    sort: search.sort === "popular" ? "newest" : search.sort,
  })
  if (!data?.ready) return <DiscoveryLoading />
  return (
    <>
      <ResultsCount kind="artists" total={data.total} />
      {data.items.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {data.items.map((artist) => (
            <ArtistCard key={artist.handle} artist={artist} />
          ))}
        </div>
      ) : (
        <DiscoveryEmpty />
      )}
      <CataloguePagination
        {...data}
        onPage={(page) => onSearch({ ...search, page })}
      />
    </>
  )
}

function ResultsCount({ kind, total }: { kind: CatalogueKind; total: number }) {
  const { t, locale } = useLocale()
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {total.toLocaleString(locale)} · {t(`discovery.${kind}`)}
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
