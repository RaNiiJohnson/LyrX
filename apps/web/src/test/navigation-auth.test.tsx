// @vitest-environment happy-dom
import { QueryClient } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { describe, expect, it, vi } from "vitest"
import { Route as RootRoute } from "@/routes/__root"

const auth = vi.hoisted(() => vi.fn(() => Promise.resolve(null)))
vi.mock("@/lib/auth-server", () => ({ getAuthToken: auth }))
// Execute the actual root auth handler locally; a deferred HTTP round trip in
// the browser has the same dependency on each beforeLoad invocation.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ handler: (fn: () => Promise<unknown>) => fn }),
}))

describe("navigation auth initialization", () => {
  it("does not repeat the initial auth request when preloading and entering another public page", async () => {
    const index = createRoute({ getParentRoute: () => RootRoute, path: "/" })
    const albums = createRoute({
      getParentRoute: () => RootRoute,
      path: "albums",
      loader: () => ({ ready: true }),
    })
    const queryClient = new QueryClient()
    const router = createRouter({
      routeTree: RootRoute.addChildren([index, albums]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
      context: { queryClient, convexClient: null, convexQueryClient: null },
      defaultPreload: "intent",
      defaultPreloadStaleTime: 0,
    })
    await router.load()
    expect(auth).toHaveBeenCalledTimes(1)
    await router.preloadRoute({ to: "/albums" })
    await router.navigate({ to: "/albums" })
    expect(auth).toHaveBeenCalledTimes(1)
    queryClient.clear()
  })
})
