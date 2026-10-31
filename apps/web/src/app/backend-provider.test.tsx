// @vitest-environment happy-dom
import { ConvexQueryClient, convexQuery } from "@convex-dev/react-query"
import { QueryClient } from "@tanstack/react-query"
import { api } from "@lyrx/backend/convex/_generated/api"
import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { getFunctionName, makeFunctionReference } from "convex/server"
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { BackendProvider } from "./backend-provider"

// Keep the real provider/cache/SDK hooks; replace only authentication transport.
vi.mock("@convex-dev/better-auth/react", () => ({
  ConvexBetterAuthProvider: ({
    children,
    client,
  }: {
    children: ReactNode
    client: ConvexReactClient
  }) => <ConvexProvider client={client}>{children}</ConvexProvider>,
}))
vi.mock("@/lib/auth-client", () => ({ providerAuthClient: {} }))

type Args = Record<string, unknown>
type Entry = { value: unknown; listeners: Set<() => void>; args: Args }
function transport() {
  const client = new ConvexReactClient("https://cache-test.convex.cloud")
  const entries = new Map<string, Entry>()
  const key = (ref: Parameters<typeof getFunctionName>[0], args: Args) =>
    JSON.stringify([getFunctionName(ref), args])
  vi.spyOn(client, "watchQuery").mockImplementation(
    (...watchArgs: Parameters<ConvexReactClient["watchQuery"]>) => {
      const [ref, args = {}] = watchArgs
      const queryKey = key(ref, args)
      return {
        localQueryResult: () => {
          const value = entries.get(queryKey)?.value
          if (value instanceof Error) throw value
          return value as ReturnType<
            ReturnType<ConvexReactClient["watchQuery"]>["localQueryResult"]
          >
        },
        journal: () => undefined,
        onUpdate: (listener) => {
          let entry = entries.get(queryKey)
          if (!entry) {
            entry = { value: undefined, listeners: new Set(), args }
            entries.set(queryKey, entry)
          }
          entry.listeners.add(listener)
          return () => {
            entry.listeners.delete(listener)
            if (!entry.listeners.size) entries.delete(queryKey)
          }
        },
      }
    }
  )
  return {
    client,
    entries,
    push(
      ref: Parameters<typeof getFunctionName>[0],
      args: Args,
      value: unknown
    ) {
      const entry = entries.get(key(ref, args))
      if (!entry) throw new Error("No active subscription")
      entry.value = value
      for (const listener of entry.listeners) listener()
    },
  }
}
let remote: ReturnType<typeof transport>
let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
let queryClient: QueryClient
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.useFakeTimers()
  remote = transport()
  queryClient = new QueryClient()
  const adapter = new ConvexQueryClient(remote.client)
  adapter.connect(queryClient)
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  queryClient.clear()
  await act(() => vi.advanceTimersByTime(300_001))
  await remote.client.close()
  container.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function render(children: ReactNode) {
  await act(() =>
    root.render(
      <BackendProvider client={remote.client}>{children}</BackendProvider>
    )
  )
}
function Current({ skip = false }: { skip?: boolean }) {
  const current = useQuery(api.members.current, skip ? "skip" : {})
  return <p>{current?.state ?? "loading"}</p>
}
const first = { paginationOpts: { numItems: 24, cursor: null, id: 0 } }
const second = { paginationOpts: { numItems: 24, cursor: "next", id: 0 } }
function Pages({ status, skip = false }: { status?: "draft"; skip?: boolean }) {
  const page = usePaginatedQuery(
    api.catalogue.read.listMySongs,
    skip ? "skip" : status ? { status } : {},
    { initialNumItems: 24 }
  )
  return (
    <>
      <p>
        {page.status}:{page.results.map((row) => row.title).join(",")}
      </p>
      <button onClick={() => page.loadMore(24)}>more</button>
    </>
  )
}
const row = (title: string) => ({ title })
async function pushPage(args: Args, titles: Array<string>, isDone = false) {
  await act(() =>
    remote.push(api.catalogue.read.listMySongs, args, {
      page: titles.map(row),
      isDone,
      continueCursor: "next",
    })
  )
}

it("retains a live read on return, expires idle subscriptions after five minutes", async () => {
  await render(<Current />)
  await act(() => remote.push(api.members.current, {}, { state: "ready" }))
  await render(null)
  expect(remote.entries.size).toBe(1)
  await act(() => remote.push(api.members.current, {}, { state: "suspended" }))
  await render(<Current />)
  expect(container.textContent).toBe("suspended")
  await render(null)
  await act(() => vi.advanceTimersByTime(299_999))
  expect(remote.entries.size).toBe(1)
  await act(() => vi.advanceTimersByTime(1))
  expect(remote.entries.size).toBe(0)
  await render(<Current />)
  expect(container.textContent).toBe("loading")
})

it("skip hides an old read even while its retained subscription receives deletion errors", async () => {
  await render(<Current />)
  await act(() => remote.push(api.members.current, {}, { state: "ready" }))
  await render(<Current skip />)
  await act(() => remote.push(api.members.current, {}, new Error("NOT_FOUND")))
  expect(container.textContent).toBe("loading")
})

it("keeps pagination cursors, loading states and cached pages distinct from filter state", async () => {
  await render(<Pages />)
  expect(container.textContent).toContain("LoadingFirstPage")
  await pushPage(first, ["one"])
  expect(container.textContent).toContain("CanLoadMore:one")
  await act(() => {
    container.querySelector("button")!.click()
    container.querySelector("button")!.click()
  })
  expect(container.textContent).toContain("LoadingMore:one")
  expect(remote.entries.size).toBe(2)
  await pushPage(second, ["two"], true)
  expect(container.textContent).toContain("Exhausted:one,two")
  await render(null)
  await render(<Pages />)
  // Subscriptions survive; the hook's accumulated page state does not.
  expect(container.textContent).toContain("CanLoadMore:one")
  await act(() => container.querySelector("button")!.click())
  expect(container.textContent).toContain("Exhausted:one,two")
  await render(<Pages status="draft" />)
  expect(container.textContent).toContain("LoadingFirstPage:")
  expect(container.textContent).not.toContain("one")
  await pushPage({ status: "draft", ...first }, [], false)
  expect(container.textContent).toContain("CanLoadMore:")
  await act(() => container.querySelector("button")!.click())
  await pushPage({ status: "draft", ...second }, ["draft"], true)
  expect(container.textContent).toContain("Exhausted:draft")
  await render(<Pages skip />)
  expect(container.textContent).not.toContain("draft")
})

it("does not put Helpers reads into TanStack and shares the underlying live client", async () => {
  await render(<Current />)
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  const query = convexQuery(api.members.current, {})
  queryClient.setQueryData(query.queryKey, { state: "ready" })
  expect(remote.entries.size).toBe(1)
  await act(() => remote.push(api.members.current, {}, { state: "anonymous" }))
  expect(container.textContent).toBe("anonymous")
  expect(queryClient.getQueryData(query.queryKey)).toEqual({
    state: "anonymous",
  })
})

it("starts cold for anonymous and another account across the actual document-reload cache boundary", async () => {
  await render(<Current />)
  await act(() =>
    remote.push(api.members.current, {}, { state: "ready", owner: "A" })
  )
  queryClient.setQueryData(["old-account"], "private A")
  // Sign-out and password sign-in use location.assign, constructing a new router
  // (and therefore new Convex/Query clients). Model that lifecycle, not live auth.
  for (const state of ["anonymous", "ready"]) {
    await act(() => root.unmount())
    queryClient.clear()
    await remote.client.close()
    remote = transport()
    queryClient = new QueryClient()
    root = createRoot(container)
    await render(<Current />)
    expect(container.textContent).toBe("loading")
    expect(queryClient.getQueryData(["old-account"])).toBeUndefined()
    await act(() => remote.push(api.members.current, {}, { state, owner: "B" }))
    expect(container.textContent).toBe(state)
  }
})

const boundedRead = makeFunctionReference<"query", { id: number }, null>(
  "cacheTest:read"
)
function ManyReads() {
  // Each child uses one real cached hook; no dynamic hook count.
  return Array.from({ length: 251 }, (_, id) => <OneRead key={id} id={id} />)
}
function OneRead({ id }: { id: number }) {
  useQuery(boundedRead, { id })
  return null
}
it("bounds retained idle entries at 250 without evicting mounted readers", async () => {
  await render(<ManyReads />)
  expect(remote.entries.size).toBe(251)
  await render(null)
  expect(remote.entries.size).toBe(250)
  await act(() => vi.advanceTimersByTime(300_000))
  expect(remote.entries.size).toBe(0)
})
