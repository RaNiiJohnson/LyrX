import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import {
  CatalogueLayout,
  CataloguePagination,
  type ResultsProps,
} from "@/features/discovery/catalogue-layout"
import { AlbumCard } from "@/features/discovery/discovery-cards"
import {
  DiscoveryLoading,
  DiscoveryEmpty,
} from "@/features/discovery/discovery-states"
import { validateNonSongSearch } from "@/features/discovery/catalogue-search"
import { albumsQuery } from "@/features/discovery/catalogue-queries"

export const Route = createFileRoute("/albums/")({
  ...appRouteBoundaries,
  validateSearch: validateNonSongSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    if (!context.convexQueryClient) return
    await context.queryClient.query({
      ...albumsQuery(deps),
      staleTime: "static",
    })
  },
  component: AlbumsPage,
})

function AlbumsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <PageShell width="wide">
      <AlbumsResults
        search={search}
        onSearch={(next) => {
          void navigate({ search: next })
        }}
      />
    </PageShell>
  )
}

function AlbumsResults({ search, onSearch }: ResultsProps) {
  const { data } = useSuspenseQuery(albumsQuery(search))
  return (
    <CatalogueLayout
      kind="albums"
      search={search}
      onSearch={onSearch}
      total={data.ready ? data.total : undefined}
    >
      {!data.ready ? (
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
      {data.ready ? (
        <CataloguePagination
          {...data}
          onPage={(page) => onSearch({ ...search, page })}
        />
      ) : null}
    </CatalogueLayout>
  )
}
