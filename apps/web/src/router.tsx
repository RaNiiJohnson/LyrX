import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient } from "@tanstack/react-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { ConvexReactClient } from "convex/react"

import { getPublicRuntimeConfig } from "@/lib/runtime-config"
import { routeTree } from "./routeTree.gen"

export type RouterContext = {
  convexClient: ConvexReactClient | null
  convexQueryClient: ConvexQueryClient | null
  queryClient: QueryClient
}

export function getRouter() {
  const runtimeConfig = getPublicRuntimeConfig()
  const convexClient = runtimeConfig
    ? new ConvexReactClient(runtimeConfig.convexUrl)
    : null
  const convexQueryClient = convexClient
    ? new ConvexQueryClient(convexClient)
    : null
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: convexQueryClient
        ? {
            queryFn: convexQueryClient.queryFn(),
            queryKeyHashFn: convexQueryClient.hashFn(),
          }
        : {},
    },
  })
  convexQueryClient?.connect(queryClient)

  const router = createTanStackRouter({
    routeTree,
    context: { convexClient, convexQueryClient, queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })
  setupRouterSsrQueryIntegration({ router, queryClient })
  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
