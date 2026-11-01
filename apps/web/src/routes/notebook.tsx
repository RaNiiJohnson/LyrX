import { DEFAULT_LOCALE, formatMessage } from "@lyrx/shared"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { RouteBoundaryShell } from "@/app/route-boundary-shell"
import { getErrorMessage } from "@/lib/errors"
import { useState } from "react"
import { LockKeyhole } from "lucide-react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "convex-helpers/react/cache"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { useLocale } from "@/app/locale-provider"
import { NotebookCollections } from "@/features/notebook/notebook-collections"
import { NotebookPassages } from "@/features/notebook/notebook-passages"

export const Route = createFileRoute("/notebook")({
  ...appRouteBoundaries,
  component: NotebookPage,
  errorComponent: NotebookError,
})
function NotebookPage() {
  const { t } = useLocale()
  const current = useQuery(api.members.current, {})
  return (
    <PageShell width="wide">
      {current === undefined ? (
        <Skeleton className="h-32 w-full" />
      ) : current.state !== "ready" ? (
        <Button asChild>
          <Link to="/account">{t("notebook.signIn")}</Link>
        </Button>
      ) : (
        <ReadyNotebook key={current.profile.handle} />
      )}
    </PageShell>
  )
}
function ReadyNotebook() {
  const { t } = useLocale()
  const collections = useQuery(api.notebook.read.collections, {})
  const [selected, setSelected] = useState("all")
  // A collection can disappear from another tab; never query a stale foreign ID.
  const filter =
    selected === "all" ||
    selected === "default" ||
    collections?.some((row) => row.id === selected)
      ? selected
      : "default"
  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold">{t("notebook.title")}</h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LockKeyhole className="size-4" aria-hidden="true" />
          {t("notebook.private")}
        </p>
      </header>
      {collections === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <NotebookCollections
              collections={collections}
              value={filter}
              onChange={setSelected}
            />
          </aside>
          <NotebookPassages
            key={filter}
            collections={collections}
            filter={filter}
          />
        </div>
      )}
    </section>
  )
}

function NotebookError({ error }: { error: unknown }) {
  const t = (key: Parameters<typeof formatMessage>[1]) =>
    formatMessage(DEFAULT_LOCALE, key)
  return (
    <RouteBoundaryShell>
      <Alert variant="destructive">
        <AlertTitle>{t("error.title")}</AlertTitle>
        <AlertDescription>
          {getErrorMessage(error, t)}
          <Button asChild variant="outline">
            <a href="/notebook">{t("notebook.retry")}</a>
          </Button>
        </AlertDescription>
      </Alert>
    </RouteBoundaryShell>
  )
}
