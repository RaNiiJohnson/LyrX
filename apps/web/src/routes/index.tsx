import { createFileRoute } from "@tanstack/react-router"

import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { FoundationPage } from "@/features/home/foundation-page"

export const Route = createFileRoute("/")({
  ...appRouteBoundaries,
  component: HomePage,
})

function HomePage() {
  return (
    <PageShell width="wide" fullBleed>
      <FoundationPage />
    </PageShell>
  )
}
