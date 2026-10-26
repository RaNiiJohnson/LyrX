import { createFileRoute } from "@tanstack/react-router"
import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { CataloguePage } from "@/features/discovery/catalogue-page"
import { validateNonSongSearch } from "@/features/discovery/catalogue-search"

export const Route = createFileRoute("/albums/")({
  ...appRouteBoundaries,
  validateSearch: validateNonSongSearch,
  component: AlbumsPage,
})
function AlbumsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <CataloguePage
          kind="albums"
          search={search}
          onSearch={(next) => {
            void navigate({ search: next })
          }}
        />
      </BackendRequired>
    </PageShell>
  )
}
