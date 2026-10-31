// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "@/app/locale-provider"
import { CoverImage, SongCard } from "./discovery-cards"
import { HorizontalRow } from "./horizontal-row"
import { CataloguePagination } from "./catalogue-layout"

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
    root.render(<LocaleProvider>{children}</LocaleProvider>)
    await Promise.resolve()
  })
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  window.localStorage.clear()
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("public discovery interactions", () => {
  it("changes numbered pages and disables unavailable previous navigation", async () => {
    const onPage = vi.fn()
    await render(<CataloguePagination page={1} pageCount={5} onPage={onPage} />)
    const previous = container.querySelector<HTMLButtonElement>(
      '[aria-label="Page précédente"]'
    )
    expect(previous?.disabled).toBe(true)
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Page 2"]')
        ?.click()
      await Promise.resolve()
    })
    expect(onPage).toHaveBeenCalledWith(2)
  })
  it("falls back for missing and broken images and can show a replacement", async () => {
    await render(<CoverImage src={null} />)
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
    await render(<CoverImage src="/broken.webp" />)
    await act(async () => {
      container.querySelector("img")?.dispatchEvent(new Event("error"))
      await Promise.resolve()
    })
    expect(container.querySelector("img")).toBeNull()
    await render(<CoverImage src="/replacement.webp" />)
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "/replacement.webp"
    )
  })
  it("keeps origins visible and links to their separate detail routes", async () => {
    const common = {
      id: "id",
      title: "A long song title",
      primaryArtist: "Credited Artist",
      artworkUrl: null,
    }
    await render(
      <>
        <SongCard song={{ ...common, origin: "artist", href: "/songs/id" }} />
        <SongCard
          song={{ ...common, origin: "community", href: "/community/id" }}
        />
      </>
    )
    expect(
      container.querySelectorAll("[data-slot=badge]")[0]?.textContent
    ).toBe("Artiste")
    expect(
      container.querySelectorAll("[data-slot=badge]")[1]?.textContent
    ).toBe("Communauté")
    expect(
      [...container.querySelectorAll("a")].map((link) =>
        link.getAttribute("href")
      )
    ).toEqual(["/songs/id", "/community/id"])
  })
  it("provides a labelled keyboard-scrollable region without intercepting child keys", async () => {
    await render(
      <HorizontalRow title="Albums" href="/albums">
        <a href="/albums/one">One album</a>
        <a href="/albums/two">Another album</a>
      </HorizontalRow>
    )
    const region = container.querySelector<HTMLElement>('[role="region"]')!
    Object.defineProperty(region, "clientWidth", {
      configurable: true,
      value: 300,
    })
    const scroll = vi.fn()
    region.scrollBy = scroll
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList)
    region.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowRight",
        cancelable: true,
      })
    )
    expect(scroll).toHaveBeenCalledWith({ left: 240, behavior: "instant" })
    region
      .querySelector("a")
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" })
      )
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(region.tabIndex).toBe(0)
    expect(
      document.getElementById(region.getAttribute("aria-labelledby") ?? "")
        ?.textContent
    ).toBe("Albums")
  })
  it("updates desktop overflow controls on scroll and both resize paths", async () => {
    let resize = () => undefined
    const observed: Array<Element> = []
    const disconnect = vi.fn()
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(update: () => undefined) {
          resize = update
        }
        observe(element: Element) {
          observed.push(element)
        }
        disconnect = disconnect
      }
    )
    await render(
      <HorizontalRow title="Artists" href="/artists">
        <a href="/artists/one">One artist</a>
        <a href="/artists/two">Another artist</a>
      </HorizontalRow>
    )
    const region = container.querySelector<HTMLElement>('[role="region"]')!
    let width = 300
    Object.defineProperties(region, {
      clientWidth: { configurable: true, get: () => width },
      scrollWidth: { configurable: true, value: 900 },
    })
    const scroll = vi.fn()
    region.scrollBy = scroll
    const media = vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList)
    await act(async () => {
      resize()
      await Promise.resolve()
    })
    const previous = () =>
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Éléments précédents"]'
      )
    const next = () =>
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Éléments suivants"]'
      )
    expect(previous()?.disabled).toBe(true)
    expect(next()?.disabled).toBe(false)
    expect(observed).toEqual([region, ...region.children])
    await act(async () => {
      next()?.click()
      await Promise.resolve()
    })
    expect(scroll).toHaveBeenLastCalledWith({ left: 240, behavior: "smooth" })
    await act(async () => {
      region.scrollLeft = 600
      region.dispatchEvent(new Event("scroll"))
      await Promise.resolve()
    })
    expect(previous()?.disabled).toBe(false)
    expect(next()?.disabled).toBe(true)
    media.mockReturnValue({ matches: true } as MediaQueryList)
    await act(async () => {
      previous()?.click()
      await Promise.resolve()
    })
    expect(scroll).toHaveBeenLastCalledWith({ left: -240, behavior: "instant" })
    await act(async () => {
      region.scrollLeft = 0
      width = 1000
      resize()
      await Promise.resolve()
    })
    expect(next()).toBeNull()
    await act(async () => {
      width = 300
      window.dispatchEvent(new Event("resize"))
      await Promise.resolve()
    })
    expect(next()?.disabled).toBe(false)
    await render(
      <HorizontalRow title="Artists" href="/artists" empty>
        <p>No artists are available</p>
      </HorizontalRow>
    )
    expect(next()).toBeNull()
    expect(container.querySelector('[role="region"]')).toBeNull()
    expect(container.textContent).toContain("No artists are available")
    await render(<span>Unmounted row</span>)
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
