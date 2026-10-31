import { convexQuery } from "@convex-dev/react-query"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { CatalogueSearch } from "./catalogue-search"

// One argument policy for loaders, intent preloads and reactive readers.
export const songsQuery = (search: CatalogueSearch) =>
  convexQuery(api.discovery.read.listSongs, {
    page: search.page,
    sort: search.sort,
    origin: search.artist ? "artist" : search.origin,
    genre: search.artist ? undefined : search.genre,
    artistHandle: search.artist,
  })
export const albumsQuery = (search: CatalogueSearch) =>
  convexQuery(api.discovery.read.listAlbums, {
    page: search.page,
    sort: search.sort === "popular" ? "newest" : search.sort,
    artistHandle: search.artist,
  })
export const artistsQuery = (search: CatalogueSearch) =>
  convexQuery(api.discovery.read.listArtists, {
    page: search.page,
    sort: search.sort === "popular" ? "newest" : search.sort,
  })
