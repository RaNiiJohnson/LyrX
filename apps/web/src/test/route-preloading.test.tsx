// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { ConvexQueryClient } from "@convex-dev/react-query"
import {
  QueryClient,
  QueryClientProvider,
  useSuspenseQuery,
  type QueryFunctionContext,
} from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Route as SongsRoute } from "@/routes/songs/index"
import { songsQuery } from "@/features/discovery/catalogue-queries"
import { validateCatalogueSearch } from "@/features/discovery/catalogue-search"
import { getRouter, type RouterContext } from "@/router"

vi.mock("@/lib/runtime-config", () => ({ getPublicRuntimeConfig: () => null }))

const clients: Array<QueryClient> = []
let unmount: (() => void) | undefined

afterEach(() => {
  unmount?.()
  unmount = undefined
  clients.splice(0).forEach((client) => client.clear())
  vi.unstubAllGlobals()
})

describe("public route intent preloading", () => {
  it.each(["mouseover", "touchstart"])(
    "loads the URL's exact query on %s before navigation and reuses it on arrival",
    async (eventType) => {
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
      const read = vi.fn((_context: QueryFunctionContext) =>
        Promise.resolve({
          ready: true,
          items: [],
          total: 0,
          page: 3,
          pageCount: 3,
        })
      )
      const queryClient = new QueryClient({
        defaultOptions: { queries: { queryFn: read, retry: false } },
      })
      clients.push(queryClient)
      const rootRoute = createRootRouteWithContext<RouterContext>()({
        component: Outlet,
        loader: () => Promise.resolve(null as string | null | undefined),
      })
      const indexRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/",
        component: () => (
          <Link
            to="/songs"
            search={{
              page: 3,
              sort: "title",
              origin: "community",
              genre: "pop",
            }}
          >
            Browse
          </Link>
        ),
      })
      const songsRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "songs",
        validateSearch: validateCatalogueSearch,
        loaderDeps: ({ search }) => search,
        loader: SongsRoute.options.loader,
        component: Results,
        pendingComponent: () => <p>Loading catalogue</p>,
      })
      function Results() {
        const { data } = useSuspenseQuery(songsQuery(songsRoute.useSearch()))
        return <p>Page {data.page}</p>
      }
      const applicationOptions = getRouter().options
      const router = createRouter({
        routeTree: rootRoute.addChildren([indexRoute, songsRoute]),
        history: createMemoryHistory({ initialEntries: ["/"] }),
        context: {
          queryClient,
          convexClient: null,
          convexQueryClient: new ConvexQueryClient("https://test.convex.cloud"),
        },
        defaultPreload: "intent",
        defaultPreloadStaleTime: 0,
        defaultPendingMs: applicationOptions.defaultPendingMs,
        defaultPendingMinMs: applicationOptions.defaultPendingMinMs,
      })
      const container = document.createElement("div")
      document.body.append(container)
      const root = createRoot(container)
      unmount = () => {
        act(() => root.unmount())
        container.remove()
      }
      await act(async () => {
        await router.load()
        root.render(
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        )
      })
      expect(read).not.toHaveBeenCalled()
      await act(async () => {
        container
          .querySelector("a")!
          .dispatchEvent(new Event(eventType, { bubbles: true }))
        await new Promise((resolve) => setTimeout(resolve, 120))
      })
      expect(router.state.location.pathname).toBe("/")
      expect(read).toHaveBeenCalledTimes(1)
      const expected = songsQuery({
        page: 3,
        sort: "title",
        origin: "community",
        genre: "pop",
      })
      expect(read.mock.calls[0]?.[0].queryKey).toEqual(expected.queryKey)
      expect(queryClient.getQueryData(expected.queryKey)).toMatchObject({
        page: 3,
      })
      await act(async () => {
        await router.navigate({
          to: "/songs",
          search: { page: 3, sort: "title", origin: "community", genre: "pop" },
        })
      })
      expect(container.textContent).toBe("Page 3")
      expect(read).toHaveBeenCalledTimes(1)
      let complete: (() => void) | undefined
      read.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = () =>
              resolve({
                ready: true,
                items: [],
                total: 0,
                page: 1,
                pageCount: 3,
              })
          })
      )
      let navigation: Promise<void>
      await act(async () => {
        navigation = router.navigate({
          to: "/songs",
          search: { page: 1, sort: "popular", artist: "artist" },
        })
        await new Promise((resolve) => setTimeout(resolve, 200))
      })
      const pending = [...container.querySelectorAll("p")].find(
        (element) => element.textContent === "Loading catalogue"
      )
      expect(pending).toBeDefined()
      expect(pending?.closest('[hidden], [style*="display: none"]')).toBeNull()
      await act(async () => {
        complete?.()
        await navigation
      })
      expect(container.textContent).toBe("Page 1")
      expect(read).toHaveBeenCalledTimes(2)
      expect(
        queryClient.getQueryData(
          songsQuery({ page: 1, sort: "popular", artist: "artist" }).queryKey
        )
      ).toBeDefined()
    }
  )
})
