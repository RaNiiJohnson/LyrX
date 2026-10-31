import { vi } from "vitest"
import { Route as SongsRoute } from "@/routes/songs/index"
import { Route as AlbumsRoute } from "@/routes/albums/index"
import { Route as ArtistsRoute } from "@/routes/artists/index"
import type {
  ResultsProps,
  CatalogueKind,
} from "@/features/discovery/catalogue-layout"

export {
  CataloguePagination,
  type CatalogueKind,
} from "@/features/discovery/catalogue-layout"
export function CataloguePage({
  kind,
  search,
  onSearch,
}: ResultsProps & { kind: CatalogueKind }) {
  const route =
    kind === "songs"
      ? SongsRoute
      : kind === "albums"
        ? AlbumsRoute
        : ArtistsRoute
  vi.spyOn(route, "useSearch").mockReturnValue(search)
  vi.spyOn(route, "useNavigate").mockReturnValue(
    (options?: { search?: unknown }) => {
      onSearch(options?.search as typeof search)
      return Promise.resolve()
    }
  )
  const Component = route.options.component!
  return <Component />
}
