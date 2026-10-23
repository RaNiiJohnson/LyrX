import { Link } from "@tanstack/react-router"

import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { DEFAULT_LOCALE, formatMessage } from "@lyrx/shared"
import type { MessageKey } from "@lyrx/shared"

import { getErrorMessage } from "@/lib/errors"
import { RouteBoundaryShell } from "./route-boundary-shell"

// Route boundaries may render before RootApplication mounts its providers.
// Keep them independent from LocaleProvider and use the documented default.
const t = (key: MessageKey) => formatMessage(DEFAULT_LOCALE, key)

export function CatalogueRouteError({ error }: { error: unknown }) {
  return (
    <RouteBoundaryShell width="wide">
      <Alert variant="destructive">
        <AlertTitle>{t("error.unexpected")}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{getErrorMessage(error, t)}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/studio">{t("navigation.studio")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    </RouteBoundaryShell>
  )
}

export function CatalogueRoutePending() {
  return (
    <RouteBoundaryShell width="wide">
      <div aria-label={t("common.loadingCatalogue")} className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    </RouteBoundaryShell>
  )
}

export function CatalogueRouteNotFound() {
  return (
    <RouteBoundaryShell width="wide">
      <Alert>
        <AlertTitle>{t("notFound.title")}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{t("notFound.description")}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/studio">{t("navigation.studio")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    </RouteBoundaryShell>
  )
}

export function AppRouteError({ error }: { error: unknown }) {
  return (
    <RouteBoundaryShell>
      <Alert variant="destructive">
        <AlertTitle>{t("error.unexpected")}</AlertTitle>
        <AlertDescription>{getErrorMessage(error, t)}</AlertDescription>
      </Alert>
    </RouteBoundaryShell>
  )
}

export function AppRoutePending() {
  return (
    <RouteBoundaryShell>
      <div aria-label={t("common.loading")} className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    </RouteBoundaryShell>
  )
}

export function AppRouteNotFound() {
  return (
    <RouteBoundaryShell>
      <Alert>
        <AlertTitle>{t("notFound.title")}</AlertTitle>
        <AlertDescription>{t("notFound.description")}</AlertDescription>
      </Alert>
    </RouteBoundaryShell>
  )
}

export const appRouteBoundaries = {
  errorComponent: AppRouteError,
  notFoundComponent: AppRouteNotFound,
  pendingComponent: AppRoutePending,
}
