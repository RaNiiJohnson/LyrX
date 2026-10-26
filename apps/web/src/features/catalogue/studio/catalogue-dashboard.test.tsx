// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "@/app/locale-provider"
import { CatalogueDashboard } from "./catalogue-dashboard"

const mocks = vi.hoisted(() => ({
  tab: "songs",
  navigate: vi.fn(),
  list: vi.fn(),
}))
vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({ useSearch: () => ({ tab: mocks.tab }) }),
  useNavigate: () => mocks.navigate,
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock("convex/react", () => ({
  usePaginatedQuery: (...args: Array<unknown>) => mocks.list(...args),
}))
vi.mock("./catalogue-item-card", () => ({
  SongCard: () => <article>My song</article>,
  AlbumCard: () => <article>My album</article>,
}))

let root: ReturnType<typeof createRoot>
let container: HTMLDivElement
async function render() {
  await act(async () => {
    root.render(
      <LocaleProvider>
        <CatalogueDashboard />
      </LocaleProvider>
    )
    await Promise.resolve()
  })
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  mocks.tab = "songs"
  mocks.navigate.mockReset()
  mocks.list.mockReset().mockReturnValue({
    status: "Exhausted",
    results: [{ _id: "one" }],
    loadMore: vi.fn(),
  })
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("Studio catalogue controls", () => {
  it("keeps one in-flow creation action synchronized with the selected URL tab", async () => {
    await render()
    expect(
      [...container.querySelectorAll("a")].map((link) =>
        link.getAttribute("href")
      )
    ).toEqual(["/studio/songs/new"])
    expect(
      container.querySelector('[role="tab"][data-state="active"]')?.textContent
    ).toContain("Morceaux")
    expect(container.querySelector('[role="tablist"]')?.className).toContain(
      "grid-cols-2"
    )
    expect(container.querySelector("a")?.parentElement?.className).toContain(
      "lg:flex-row"
    )
    expect(container.querySelector(".fixed")).toBeNull()
    mocks.tab = "albums"
    await render()
    expect(
      [...container.querySelectorAll("a")].map((link) =>
        link.getAttribute("href")
      )
    ).toEqual(["/studio/albums/new"])
    expect(
      container.querySelector('[role="tab"][data-state="active"]')?.textContent
    ).toContain("Albums")
  })

  it("navigates through the real tab control without losing the intended target", async () => {
    await render()
    const albums = [
      ...container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ].find((tab) => tab.textContent.trim() === "Albums")!
    await act(async () => {
      albums.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, button: 0 })
      )
      await Promise.resolve()
    })
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/studio",
      search: { tab: "albums" },
    })
  })

  it("filters both owned queries through the real toggle group and retains the selected filter on a second click", async () => {
    await render()
    const drafts = [
      ...container.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent === "Brouillons")!
    await act(async () => {
      drafts.click()
      await Promise.resolve()
    })
    expect(mocks.list.mock.calls.slice(-2).map((call) => call[1])).toEqual([
      { status: "draft" },
      { status: "draft" },
    ])
    expect(drafts.getAttribute("aria-checked")).toBe("true")
    await act(async () => {
      drafts.click()
      await Promise.resolve()
    })
    expect(drafts.getAttribute("aria-checked")).toBe("true")
    const all = [
      ...container.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent === "Tous")!
    await act(async () => {
      all.click()
      await Promise.resolve()
    })
    expect(mocks.list.mock.calls.slice(-2).map((call) => call[1])).toEqual([
      {},
      {},
    ])
  })
})
