import type { MessageKey } from "@lyrx/shared"

/** Catalogue filter model, mirroring `apps/web/src/features/discovery/catalogue-search.ts`. */
export const SONG_GENRES = [
  "pop",
  "rock",
  "hip-hop",
  "rnb",
  "electronic",
  "jazz",
  "folk",
  "gospel",
  "reggae",
  "other",
] as const
export type SongGenre = (typeof SONG_GENRES)[number]

/** Message key of each genre label (shared with the artist studio). */
export const GENRE_LABEL_KEYS: Record<SongGenre, MessageKey> = {
  pop: "studio.genrePop",
  rock: "studio.genreRock",
  "hip-hop": "studio.genreHipHop",
  rnb: "studio.genreRnb",
  electronic: "studio.genreElectronic",
  jazz: "studio.genreJazz",
  folk: "studio.genreFolk",
  gospel: "studio.genreGospel",
  reggae: "studio.genreReggae",
  other: "studio.genreOtherOption",
}

/** Sort orders offered per tab: only songs have a "popular" order. */
export function sortsFor(kind: CatalogueKind): Array<CatalogueSort> {
  return kind === "songs" ? ["newest", "title", "popular"] : ["newest", "title"]
}

export const CATALOGUE_KINDS = ["songs", "albums", "artists"] as const
export type CatalogueKind = (typeof CATALOGUE_KINDS)[number]

export type CatalogueSort = "newest" | "title" | "popular"
export type CatalogueOrigin = "artist" | "community"

export type CatalogueFilters = {
  sort: CatalogueSort
  origin?: CatalogueOrigin
  genre?: SongGenre
}

export const DEFAULT_FILTERS: CatalogueFilters = { sort: "newest" }

/** Server page size; the backend caps it at 24. */
export const CATALOGUE_PAGE_SIZE = 24

/** Albums and artists have no "popular" order: it falls back to newest, as on the web. */
export function sortFor(kind: CatalogueKind, sort: CatalogueSort) {
  return kind !== "songs" && sort === "popular" ? "newest" : sort
}

/** Query arguments for one page of the given tab; unsupported filters are dropped per tab. */
export function catalogueArgs(
  kind: CatalogueKind,
  filters: CatalogueFilters,
  page: number,
  artistHandle?: string
) {
  const base = {
    page,
    pageSize: CATALOGUE_PAGE_SIZE,
    sort: sortFor(kind, filters.sort),
  }
  if (kind === "artists") return base
  if (kind === "albums") return { ...base, artistHandle }
  return {
    ...base,
    // An artist filter implies the "artist" origin and ignores the genre, like the web.
    origin: artistHandle ? ("artist" as const) : filters.origin,
    genre: artistHandle ? undefined : filters.genre,
    artistHandle,
  }
}

/** Number of active filters other than the sort order, for the filter button badge. */
export function activeFilterCount(
  kind: CatalogueKind,
  filters: CatalogueFilters
) {
  if (kind !== "songs") return 0
  return (filters.origin ? 1 : 0) + (filters.genre ? 1 : 0)
}

type Page<T> = { page: number; pageCount: number; items: ReadonlyArray<T> }

/**
 * Appends a freshly fetched page to what is already shown. A repeat of the last
 * page replaces it (retry or refresh); anything out of order restarts from that page.
 */
export function appendPage<T>(
  shown: ReadonlyArray<Page<T>>,
  next: Page<T>
): Array<Page<T>> {
  const last = shown.at(-1)
  if (!last || next.page === 1) return [next]
  if (next.page === last.page) return [...shown.slice(0, -1), next]
  if (next.page === last.page + 1) return [...shown, next]
  return [next]
}

export function hasMorePages<T>(shown: ReadonlyArray<Page<T>>) {
  const last = shown.at(-1)
  return last !== undefined && last.page < last.pageCount
}

export function flattenPages<T>(shown: ReadonlyArray<Page<T>>) {
  return shown.flatMap((page) => page.items)
}
