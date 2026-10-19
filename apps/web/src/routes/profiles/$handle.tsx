import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/components/backend-required"
import { PageShell } from "@/components/page-shell"
import { PublicProfile } from "@/components/public-profile"

export const Route = createFileRoute("/profiles/$handle")({
  component: PublicProfilePage,
})

function PublicProfilePage() {
  const { handle } = Route.useParams()
  return (
    <PageShell width="wide">
      <BackendRequired>
        <PublicProfile handle={handle} />
      </BackendRequired>
    </PageShell>
  )
}
