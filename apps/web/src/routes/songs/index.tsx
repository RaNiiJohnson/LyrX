import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import {
  CatalogueLayout,
  CataloguePagination,
  type ResultsProps,
} from "@/features/discovery/catalogue-layout"
import { SongCollection } from "@/features/discovery/discovery-cards"
import { useViewMode } from "@/features/discovery/view-mode"
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
  const [mode, setMode] = useViewMode()
  return (
    <CatalogueLayout
      kind="songs"
      search={search}
      onSearch={onSearch}
      total={data.ready ? data.total : undefined}
      view={{ mode, onChange: setMode }}
    >
      {!data.ready ? (
        <DiscoveryLoading />
      ) : data.items.length ? (
        <SongCollection mode={mode} songs={data.items} />
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
