import { createFileRoute } from "@tanstack/react-router"

import { PageShell } from "@/app/page-shell"
import { FoundationPage } from "@/features/home/foundation-page"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  return (
    <PageShell width="wide">
      <FoundationPage />
    </PageShell>
  )
}
