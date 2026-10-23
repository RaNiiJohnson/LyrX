import { createFileRoute, Outlet } from "@tanstack/react-router"

import {
  CatalogueRouteError,
  CatalogueRouteNotFound,
  CatalogueRoutePending,
} from "@/app/route-states"

export const Route = createFileRoute("/studio/albums/$albumId")({
  component: Outlet,
  errorComponent: CatalogueRouteError,
  notFoundComponent: CatalogueRouteNotFound,
  pendingComponent: CatalogueRoutePending,
})
