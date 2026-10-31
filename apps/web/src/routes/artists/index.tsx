import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import {
  CatalogueLayout,
  CataloguePagination,
  type ResultsProps,
} from "@/features/discovery/catalogue-layout"
import { ArtistCard } from "@/features/discovery/discovery-cards"
import {
  DiscoveryLoading,
  DiscoveryEmpty,
} from "@/features/discovery/discovery-states"
import { validateNonSongSearch } from "@/features/discovery/catalogue-search"
import { artistsQuery } from "@/features/discovery/catalogue-queries"

export const Route = createFileRoute("/artists/")({
  ...appRouteBoundaries,
  validateSearch: validateNonSongSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    if (!context.convexQueryClient) return
    await context.queryClient.query({
      ...artistsQuery(deps),
      staleTime: "static",
    })
  },
  component: ArtistsPage,
})

function ArtistsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <PageShell width="wide">
      <ArtistsResults
        search={search}
        onSearch={(next) => {
          void navigate({ search: next })
        }}
      />
    </PageShell>
  )
}

function ArtistsResults({ search, onSearch }: ResultsProps) {
  const { data } = useSuspenseQuery(artistsQuery(search))
  return (
    <CatalogueLayout
      kind="artists"
      search={search}
      onSearch={onSearch}
      total={data.ready ? data.total : undefined}
    >
      {!data.ready ? (
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
      {data.ready ? (
        <CataloguePagination
          {...data}
          onPage={(page) => onSearch({ ...search, page })}
        />
      ) : null}
    </CatalogueLayout>
  )
}
