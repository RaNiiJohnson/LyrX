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
import { CataloguePage, type CatalogueKind } from "./catalogue-page"
import {
  catalogueSearch,
  validateCatalogueSearch,
  validateNonSongSearch,
} from "./catalogue-search"

const query = vi.hoisted(() => vi.fn())
vi.mock("convex/react", () => ({ useQuery: query }))

function Screen({ kind }: { kind: CatalogueKind }) {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  return (
    <CataloguePage
      kind={kind}
      search={catalogueSearch(search)}
      onSearch={(next) => {
        void navigate({ to: `/${kind}`, search: next })
      }}
    />
  )
}

const rootRoute = createRootRoute()
const songsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/songs",
  validateSearch: validateCatalogueSearch,
  component: () => <Screen kind="songs" />,
})
const albumsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/albums",
  validateSearch: validateNonSongSearch,
  component: () => <Screen kind="albums" />,
})
const artistsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/artists",
  validateSearch: validateNonSongSearch,
  component: () => <Screen kind="artists" />,
})

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
let router: ReturnType<typeof makeRouter>
function makeRouter(entry: string) {
  return createRouter({
    routeTree: rootRoute.addChildren([songsRoute, albumsRoute, artistsRoute]),
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
async function chooseOrigin(value: "all" | "artist" | "community") {
  const labels = { all: "Tous", artist: "Artiste", community: "Communauté" }
  const button = [
    ...container.querySelectorAll<HTMLButtonElement>(
      '[data-slot="toggle-group"][aria-label="Origine"] button'
    ),
  ].find((item) => item.textContent === labels[value])
  if (!button) throw new Error(`Missing origin: ${value}`)
  await flush(() => button.click())
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
  it("navigates between catalogue categories below the title with one active link", async () => {
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
    const navigation = () =>
      container.querySelector<HTMLElement>('nav[aria-label="Catalogue"]')!
    expect(navigation().querySelectorAll("a")).toHaveLength(3)
    for (const kind of ["albums", "artists", "songs"] as const) {
      await flush(() =>
        navigation()
          .querySelector<HTMLAnchorElement>(`a[href^="/${kind}?"]`)
          ?.click()
      )
      expect(router.state.location.pathname).toBe(`/${kind}`)
      expect(router.state.location.search).toEqual({ page: 1, sort: "newest" })
      expect(
        navigation().querySelectorAll('[aria-current="page"]')
      ).toHaveLength(1)
      expect(
        navigation()
          .querySelector('[aria-current="page"]')
          ?.getAttribute("href")
      ).toContain(`/${kind}?`)
    }
  })
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
    await flush(() => {
      void router.navigate({
        to: "/songs",
        search: { ...router.state.location.search, page: 4 },
      })
    })
    await chooseOrigin("community")
    expect(router.state.location.search).toMatchObject({
      page: 1,
      sort: "title",
      origin: "community",
      genre: "rock",
    })
    await flush(() => {
      void router.navigate({
        to: "/songs",
        search: { ...router.state.location.search, page: 3 },
      })
    })
    await choose("Genre", "Tous les genres")
    expect(router.state.location.search.page).toBe(1)
    expect(router.state.location.search).not.toHaveProperty("genre")
    expect(query).toHaveBeenLastCalledWith(expect.anything(), {
      page: 1,
      sort: "title",
      origin: "community",
      genre: undefined,
      artistHandle: undefined,
    })
    await chooseOrigin("all")
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
      '[role="combobox"][aria-label="Genre"]'
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
  it("does not clear the selected origin when its active pill is clicked", async () => {
    router = makeRouter("/songs?page=4&sort=newest&origin=community")
    await router.load()
    await flush(() =>
      root.render(
        <LocaleProvider>
          <RouterProvider router={router} />
        </LocaleProvider>
      )
    )
    await chooseOrigin("community")
    expect(router.state.location.search.origin).toBe("community")
    expect(router.state.location.search.page).toBe(4)
    expect(
      [...container.querySelectorAll('[data-slot="toggle-group-item"]')]
        .find((item) => item.textContent === "Communauté")
        ?.getAttribute("data-state")
    ).toBe("on")
  })
  it.each(["albums", "artists"] as const)(
    "keeps %s compact while preserving numbered URL pages and sort reset",
    async (kind) => {
      router = makeRouter(`/${kind}?page=4&sort=newest`)
      await router.load()
      await flush(() =>
        root.render(
          <LocaleProvider>
            <RouterProvider router={router} />
          </LocaleProvider>
        )
      )
      expect(container.querySelectorAll('[role="combobox"]')).toHaveLength(1)
      expect(container.querySelector('[aria-label="Origine"]')).toBeNull()
      expect(container.querySelector("header [role=status]")?.textContent).toBe(
        kind === "albums" ? "60 albums" : "60 artistes"
      )
      await flush(() =>
        container
          .querySelector<HTMLButtonElement>('[aria-label="Page 3"]')
          ?.click()
      )
      expect(router.state.location.search.page).toBe(3)
      await choose("Trier par", "Titre A–Z")
      expect(router.state.location.search).toEqual({ page: 1, sort: "title" })
      expect(query).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ page: 1, sort: "title" })
      )
    }
  )
})
