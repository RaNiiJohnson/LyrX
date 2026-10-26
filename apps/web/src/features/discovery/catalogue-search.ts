import {
  SONG_GENRES,
  type SongGenre,
} from "@/features/catalogue/lib/catalogue-form"
import type { MessageKey } from "@lyrx/shared"
import type { SearchSchemaInput } from "@tanstack/react-router"

export const genreMessageKeys: Record<SongGenre, MessageKey> = {
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

export type CatalogueSearch = {
  page: number
  sort: "newest" | "title" | "popular"
  origin?: "artist" | "community"
  genre?: SongGenre
  artist?: string
}

export function catalogueSearch(
  input: Record<string, unknown>
): CatalogueSearch {
  const page = Number(input.page)
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    sort:
      input.sort === "title" || input.sort === "popular"
        ? input.sort
        : "newest",
    origin:
      input.origin === "artist" || input.origin === "community"
        ? input.origin
        : undefined,
    genre: SONG_GENRES.find((genre) => genre === input.genre),
    artist:
      typeof input.artist === "string" && input.artist.length <= 100
        ? input.artist
        : undefined,
  }
}

export function changeCatalogueFilter(
  search: CatalogueSearch,
  patch: Partial<Omit<CatalogueSearch, "page">>
): CatalogueSearch {
  return { ...search, ...patch, page: 1 }
}

// Navigation inputs are optional; validated reading always receives defaults.
export function validateCatalogueSearch(
  input: Partial<CatalogueSearch> & SearchSchemaInput
): CatalogueSearch {
  return catalogueSearch(input)
}
export function validateNonSongSearch(
  input: Partial<CatalogueSearch> & SearchSchemaInput
): CatalogueSearch {
  const search = catalogueSearch(input)
  return {
    ...search,
    sort: search.sort === "popular" ? "newest" : search.sort,
    origin: undefined,
    genre: undefined,
  }
}

export function visiblePages(page: number, pageCount: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, pageCount]))
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((left, right) => left - right)
}
