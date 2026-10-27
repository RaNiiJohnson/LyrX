// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "@/app/locale-provider"
import { SearchOverlay } from "./search-overlay"
import { ReleaseSlider } from "@/features/home/release-slider"

const state = vi.hoisted<{
  data: unknown
  calls: Array<unknown>
  fail: boolean
}>(() => ({
  data: undefined,
  calls: [] as Array<unknown>,
  fail: false,
}))
vi.mock("convex/react", () => ({
  useQuery: (_query: unknown, args: unknown) => {
    state.calls.push(args)
    if (state.fail) throw new Error("technical failure")
    return state.data
  },
}))
vi.mock("@/app/backend-required", () => ({
  BackendRequired: ({ children }: { children: ReactNode }) => children,
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))
let root: ReturnType<typeof createRoot>
let container: HTMLDivElement
async function render(children: ReactNode) {
  await act(async () => {
    await Promise.resolve()
    root.render(<LocaleProvider>{children}</LocaleProvider>)
    await Promise.resolve()
  })
}
async function openAndSubmit(text: string) {
  await act(() => {
    container.querySelector<HTMLButtonElement>("button")!.click()
  })
  const input = document.querySelector<HTMLInputElement>("#public-search")!
  await act(async () => {
    await Promise.resolve()
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )!.set!
    setter.call(input, text)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  expect(state.calls).toHaveLength(0)
  await act(async () => {
    await Promise.resolve()
    input
      .closest("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    await Promise.resolve()
  })
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  state.calls = []
  state.data = undefined
  state.fail = false
  window.localStorage.clear()
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("public search overlay", () => {
  it("submits deliberately, paginates native cursors and shows Fan attribution and matching excerpts", async () => {
    state.data = {
      ready: true,
      page: [
        {
          id: "fan",
          kind: "song",
          title: "Hira",
          context: "Artist",
          origin: "community",
          contributor: "A Fan",
          artworkUrl: null,
          href: "/community/fan",
          excerpt: "Tiako ny hira",
        },
      ],
      isDone: false,
      continueCursor: "next-cursor",
    }
    await render(<SearchOverlay />)
    await openAndSubmit("Tiako")
    expect(state.calls).toContainEqual({
      text: "Tiako",
      paginationOpts: { cursor: null, numItems: 12 },
    })
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain("Communauté")
    expect(dialog.textContent).toContain("Partagé par A Fan")
    expect(dialog.textContent).toContain("Tiako ny hira")
    expect(dialog.querySelector("a")?.getAttribute("href")).toBe(
      "/community/fan"
    )
    await act(async () => {
      await Promise.resolve()
      Array.from(dialog.querySelectorAll("button"))
        .find((button) => button.textContent === "Page suivante")!
        .click()
    })
    expect(state.calls).toContainEqual({
      text: "Tiako",
      paginationOpts: { cursor: "next-cursor", numItems: 12 },
    })
    await act(async () => {
      await Promise.resolve()
      dialog.querySelector("a")!.click()
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
  it.each([
    [undefined, ""],
    [{ ready: false, page: [], isDone: true }, "actualisation"],
    [{ ready: true, page: [], isDone: true }, "Aucun résultat public"],
    [
      { ready: true, page: [], isDone: false, continueCursor: "next" },
      "Vous pouvez continuer",
    ],
  ])(
    "distinguishes loading, unavailable, empty and a short continuing page: %j",
    async (data, expected) => {
      state.data = data
      await render(<SearchOverlay />)
      await openAndSubmit("hira")
      if (data === undefined)
        expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull()
      else
        expect(
          document.querySelector('[role="dialog"]')?.textContent
        ).toContain(expected)
    }
  )
  it("keeps technical errors out of user copy and allows resubmission", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    state.fail = true
    await render(<SearchOverlay />)
    await openAndSubmit("hira")
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Recherche indisponible"
    )
    expect(
      document.querySelector('[role="dialog"]')?.textContent
    ).not.toContain("technical failure")
    state.fail = false
    state.data = { ready: true, page: [], isDone: true }
    await act(async () => {
      await Promise.resolve()
      document
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    })
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })
  it("rejects tokenless input before issuing a request", async () => {
    await render(<SearchOverlay />)
    await openAndSubmit("!!!")
    expect(state.calls).toEqual([])
    expect(document.querySelector("#search-validation")?.textContent).toContain(
      "16 mots"
    )
  })
})

describe("release slider", () => {
  const release = (id: string) => ({
    id,
    title: `Title ${id}`,
    primaryArtist: "Artist",
    origin: "artist" as const,
    artworkUrl: null,
    href: `/songs/${id}`,
    firstPublishedAt: Number(id),
  })
  it("handles zero and one public release without phantom controls or imagery", async () => {
    await render(<ReleaseSlider songs={[]} albums={[]} />)
    expect(container.querySelectorAll("article")).toHaveLength(0)
    await render(<ReleaseSlider songs={[release("1")]} albums={[]} />)
    expect(container.querySelectorAll("article")).toHaveLength(1)
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelectorAll("button")).toHaveLength(0)
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/songs/1")
  })
  it("bounds selection, sorts existing releases and respects keyboard and reduced motion", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    await render(
      <ReleaseSlider
        songs={Array.from({ length: 9 }, (_, i) => release(String(i)))}
        albums={[]}
      />
    )
    expect(container.querySelectorAll("article")).toHaveLength(6)
    expect(container.querySelector("h3")?.textContent).toBe("Title 8")
    const region = container.querySelector<HTMLElement>('[role="region"]')!
    Object.defineProperty(region, "clientWidth", { value: 400 })
    region.scrollTo = vi.fn()
    await act(async () => {
      await Promise.resolve()
      region.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      )
    })
    expect(region.scrollTo).toHaveBeenCalledWith({
      left: 400,
      behavior: "instant",
    })
  })
})
