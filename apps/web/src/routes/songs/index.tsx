import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import {
  CatalogueLayout,
  CataloguePagination,
  type ResultsProps,
} from "@/features/discovery/catalogue-layout"
import { SongCard } from "@/features/discovery/discovery-cards"
import {
  DiscoveryLoading,
  DiscoveryEmpty,
} from "@/features/discovery/discovery-states"
import { validateCatalogueSearch } from "@/features/discovery/catalogue-search"
import { songsQuery } from "@/features/discovery/catalogue-queries"

export const Route = createFileRoute("/songs/")({
  ...appRouteBoundaries,
  validateSearch: validateCatalogueSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    if (!context.convexQueryClient) return
    await context.queryClient.query({
      ...songsQuery(deps),
      staleTime: "static",
    })
  },
  component: SongsPage,
})

function SongsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <PageShell width="wide">
      <SongsResults
        search={search}
        onSearch={(next) => {
          void navigate({ search: next })
        }}
      />
    </PageShell>
  )
}

function SongsResults({ search, onSearch }: ResultsProps) {
  const { data } = useSuspenseQuery(songsQuery(search))
  return (
    <CatalogueLayout
      kind="songs"
      search={search}
      onSearch={onSearch}
      total={data.ready ? data.total : undefined}
    >
      {!data.ready ? (
        <DiscoveryLoading />
      ) : data.items.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {data.items.map((song) => (
            <SongCard
              key={`${song.origin}:${song.id}`}
              song={song}
              presentation="cover"
            />
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
