// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useNavigate,
  useSearch,
} from "@tanstack/react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "@/app/locale-provider"
import { CataloguePage } from "./catalogue-page"
import { catalogueSearch, validateCatalogueSearch } from "./catalogue-search"

const query = vi.hoisted(() => vi.fn())
vi.mock("convex/react", () => ({ useQuery: query }))

function Screen() {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  return (
    <CataloguePage
      kind="songs"
      search={catalogueSearch(search)}
      onSearch={(next) => {
        void navigate({ to: "/songs", search: next })
      }}
    />
  )
}

const rootRoute = createRootRoute()
const songsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/songs",
  validateSearch: validateCatalogueSearch,
  component: Screen,
})

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
let router: ReturnType<typeof makeRouter>
function makeRouter(entry: string) {
  return createRouter({
    routeTree: rootRoute.addChildren([songsRoute]),
    history: createMemoryHistory({ initialEntries: [entry] }),
  })
}
async function flush(action: () => void) {
  await act(async () => {
    action()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
async function choose(label: string, optionLabel: string) {
  const trigger = container.querySelector<HTMLElement>(
    `[role="combobox"][aria-label="${label}"]`
  )
  if (!trigger) throw new Error(`Missing filter: ${label}`)
  await flush(() =>
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    )
  )
  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => item.textContent === optionLabel)
  if (!option) throw new Error(`Missing filter option: ${optionLabel}`)
  await flush(() => option.click())
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  query
    .mockReset()
    .mockImplementation((_query: unknown, args: { page: number }) => ({
      ready: true,
      items: [],
      total: 60,
      page: args.page,
      pageCount: 5,
    }))
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await flush(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("catalogue filters through Radix and URL navigation", () => {
  it("resets the URL page for sort/origin/genre while preserving other filters", async () => {
    router = makeRouter("/songs?page=4&sort=newest&origin=artist&genre=rock")
    await router.load()
    await flush(() =>
      root.render(
        <LocaleProvider>
          <RouterProvider router={router} />
        </LocaleProvider>
      )
    )
    await choose("Trier par", "Titre A–Z")
    expect(router.state.location.search).toMatchObject({
      page: 1,
      sort: "title",
      origin: "artist",
      genre: "rock",
    })
    await choose("Origine", "Communauté")
    expect(router.state.location.search).toMatchObject({
      page: 1,
      sort: "title",
      origin: "community",
      genre: "rock",
    })
    await choose("Genre", "Tous les genres")
    expect(router.state.location.search).not.toHaveProperty("genre")
    expect(query).toHaveBeenLastCalledWith(expect.anything(), {
      page: 1,
      sort: "title",
      origin: "community",
      genre: undefined,
      artistHandle: undefined,
    })
    await choose("Origine", "Toutes les origines")
    expect(router.state.location.search).not.toHaveProperty("origin")
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })
  it("keeps filter state in numbered-page URLs and leaves it unchanged on Escape", async () => {
    router = makeRouter(
      "/songs?page=4&sort=popular&origin=community&genre=rock"
    )
    await router.load()
    await flush(() =>
      root.render(
        <LocaleProvider>
          <RouterProvider router={router} />
        </LocaleProvider>
      )
    )
    await flush(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Page 3"]')
        ?.click()
    )
    expect(router.state.location.search).toEqual({
      page: 3,
      sort: "popular",
      origin: "community",
      genre: "rock",
    })
    expect(
      new URLSearchParams(router.history.location.search).get("page")
    ).toBe("3")
    const trigger = container.querySelector<HTMLElement>(
      '[aria-label="Origine"]'
    )!
    await flush(() =>
      trigger.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    )
    await flush(() =>
      document
        .querySelector('[role="listbox"]')
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        )
    )
    expect(router.state.location.search.page).toBe(3)
    expect(router.state.location.search.origin).toBe("community")
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })
})
