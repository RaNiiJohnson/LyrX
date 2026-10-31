// @vitest-environment happy-dom
import { act, useEffect, type ReactNode } from "react"
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
const slider = vi.hoisted(() => {
  let index = 0
  const listeners = new Map<string, Set<() => void>>()
  const emit = (name: string) => listeners.get(name)?.forEach((fn) => fn())
  const api = {
    selectedScrollSnap: () => index,
    rootNode: () => document.body,
    slideNodes: () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-test-slide]")),
    scrollTo: vi.fn((next: number, _jump?: boolean) => {
      index = next
      emit("select")
      emit("settle")
    }),
    scrollNext: vi.fn(() => {
      index = (index + 1) % 2
      emit("select")
      emit("settle")
    }),
    on: (event: string, listener: () => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(listener)
      return api
    },
    off: (event: string, listener: () => void) => {
      listeners.get(event)?.delete(listener)
      return api
    },
  }
  return {
    api,
    emit,
    reset: () => {
      index = 0
      listeners.clear()
      api.scrollTo.mockClear()
      api.scrollNext.mockClear()
    },
  }
})
vi.mock("@lyrx/ui/components/carousel", () => ({
  Carousel: ({
    setApi,
    opts: _opts,
    children,
    ...props
  }: {
    setApi: (api: typeof slider.api) => void
    opts: unknown
    children: ReactNode
  }) => {
    useEffect(() => setApi(slider.api), [setApi])
    return (
      <div role="region" {...props}>
        {children}
      </div>
    )
  },
  CarouselContent: ({ children, ...props }: { children: ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  CarouselItem: ({ children, ...props }: { children: ReactNode }) => (
    <div data-test-slide {...props}>
      {children}
    </div>
  ),
}))
vi.mock("convex/react", () => ({
  useQuery: (_query: unknown, args: unknown) => {
    state.calls.push(args)
    if (state.fail) throw new Error("technical failure")
    return state.data
  },
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
  slider.reset()
  state.calls = []
  state.data = undefined
  state.fail = false
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
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
  vi.useRealTimers()
})

describe("public search overlay", () => {
  it.each(["ctrlKey", "metaKey"] as const)(
    "opens and focuses search with %s + K",
    async (modifier) => {
      await render(<SearchOverlay />)
      const event = new KeyboardEvent("keydown", {
        key: "k",
        [modifier]: true,
        bubbles: true,
        cancelable: true,
      })
      await act(() => window.dispatchEvent(event))
      expect(event.defaultPrevented).toBe(true)
      expect(document.querySelector('[role="dialog"]')).not.toBeNull()
      expect(document.activeElement?.id).toBe("public-search")
      expect(
        container.querySelector("button")?.getAttribute("aria-keyshortcuts")
      ).toBe("Control+K Meta+K")
    }
  )
  it("searches after a typing pause, cancels intermediate terms and clears stale results", async () => {
    vi.useFakeTimers()
    state.data = { ready: true, page: [], isDone: true }
    await render(<SearchOverlay />)
    await act(() =>
      container.querySelector<HTMLButtonElement>("button")!.click()
    )
    const input = document.querySelector<HTMLInputElement>("#public-search")!
    const type = async (value: string) => {
      await act(() => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value"
        )!.set!.call(input, value)
        input.dispatchEvent(new Event("input", { bubbles: true }))
      })
    }
    await type("mi")
    await act(() => vi.advanceTimersByTimeAsync(300))
    await type("miss")
    await act(() => vi.advanceTimersByTimeAsync(499))
    expect(state.calls).toHaveLength(0)
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(state.calls).toContainEqual({
      text: "miss",
      paginationOpts: { cursor: null, numItems: 12 },
    })
    expect(state.calls).not.toContainEqual(
      expect.objectContaining({ text: "mi" })
    )
    for (const value of ["t", "te", "tes", "test"]) {
      await type(value)
      await act(() => vi.advanceTimersByTimeAsync(100))
    }
    await act(() => vi.advanceTimersByTimeAsync(399))
    for (const text of ["t", "te", "tes", "test"]) {
      expect(state.calls).not.toContainEqual(expect.objectContaining({ text }))
    }
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      "Aucun résultat public"
    )
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(state.calls).toContainEqual(
      expect.objectContaining({ text: "test" })
    )
    await type("")
    expect(
      document.querySelector('[role="dialog"]')?.textContent
    ).not.toContain("Aucun résultat public")
    const calls = state.calls.length
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(state.calls).toHaveLength(calls)
  })
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
  it("handles zero and one public release without phantom releases or controls", async () => {
    await render(<ReleaseSlider songs={[]} albums={[]} />)
    expect(container.querySelectorAll("article")).toHaveLength(0)
    await render(<ReleaseSlider songs={[release("1")]} albums={[]} />)
    expect(container.querySelectorAll("article")).toHaveLength(1)
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelectorAll("button")).toHaveLength(0)
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/songs/1")
  })
  it("rotates automatically, pauses on hover and focus, and can be explicitly paused", async () => {
    vi.useFakeTimers()
    await render(
      <ReleaseSlider songs={[release("1"), release("2")]} albums={[]} />
    )
    const region = container.querySelector<HTMLElement>('[role="region"]')!
    await act(() => vi.advanceTimersByTimeAsync(7000))
    expect(
      container
        .querySelector('[aria-current="true"]')
        ?.getAttribute("aria-label")
    ).toBe("Aller au projet 2")
    await act(() =>
      container.querySelector("section")!.dispatchEvent(
        new PointerEvent("pointerover", {
          bubbles: true,
          pointerType: "mouse",
        })
      )
    )
    await act(() => vi.advanceTimersByTimeAsync(14000))
    expect(slider.api.scrollNext).toHaveBeenCalledTimes(1)
    await act(() =>
      container.querySelector("section")!.dispatchEvent(
        new PointerEvent("pointerout", {
          bubbles: true,
          pointerType: "mouse",
        })
      )
    )
    await act(() => vi.advanceTimersByTimeAsync(7000))
    expect(slider.api.scrollNext).toHaveBeenCalledTimes(2)
    vi.spyOn(region, "matches").mockReturnValue(true)
    await act(() =>
      region.dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
    )
    await act(() => vi.advanceTimersByTimeAsync(14000))
    expect(slider.api.scrollNext).toHaveBeenCalledTimes(2)
    await act(() =>
      region.dispatchEvent(
        new FocusEvent("focusout", {
          bubbles: true,
          relatedTarget: document.body,
        })
      )
    )
    await act(() => vi.advanceTimersByTimeAsync(7000))
    expect(slider.api.scrollNext).toHaveBeenCalledTimes(3)
    await act(() =>
      container.querySelector<HTMLButtonElement>("[data-rotation]")!.click()
    )
    await act(() => vi.advanceTimersByTimeAsync(14000))
    expect(slider.api.scrollNext).toHaveBeenCalledTimes(3)
    await act(() =>
      container.querySelector<HTMLButtonElement>("[data-rotation]")!.click()
    )
    await act(() => vi.advanceTimersByTimeAsync(7000))
    expect(slider.api.scrollNext).toHaveBeenCalledTimes(4)
  })
  it("restarts a full delay after releasing a held pointer, including outside the hero", async () => {
    vi.useFakeTimers()
    await render(
      <ReleaseSlider songs={[release("1"), release("2")]} albums={[]} />
    )
    const region = container.querySelector<HTMLElement>('[role="region"]')!
    await act(() => vi.advanceTimersByTimeAsync(6000))
    await act(() =>
      region.dispatchEvent(new Event("pointerdown", { bubbles: true }))
    )
    await act(() => vi.advanceTimersByTimeAsync(14000))
    expect(slider.api.scrollNext).not.toHaveBeenCalled()
    await act(() => window.dispatchEvent(new Event("pointerup")))
    await act(() => vi.advanceTimersByTimeAsync(6999))
    expect(slider.api.scrollNext).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(slider.api.scrollNext).toHaveBeenCalledTimes(1)
  })
  it("reuses artwork for the cover and only the active blurred layer, with a broken-image fallback", async () => {
    await render(
      <ReleaseSlider
        songs={[
          { ...release("2"), artworkUrl: "/cover-two.jpg" },
          { ...release("1"), artworkUrl: "/cover-one.jpg" },
        ]}
        albums={[]}
      />
    )
    const images = Array.from(container.querySelectorAll("img"))
    expect(images).toHaveLength(3)
    expect(
      images.filter((img) => img.getAttribute("src") === "/cover-two.jpg")
    ).toHaveLength(2)
    expect(
      images.filter((img) => img.getAttribute("src") === "/cover-one.jpg")
    ).toHaveLength(1)
    await act(() => images[0]!.dispatchEvent(new Event("error")))
    expect(
      container.querySelectorAll('img[src="/cover-two.jpg"]')
    ).toHaveLength(0)
    expect(container.querySelector('a[href="/songs/2"]')).not.toBeNull()
  })
  it("uses the carousel selection as its single source of truth and waits for settling before rotating", async () => {
    vi.useFakeTimers()
    await render(
      <ReleaseSlider songs={[release("1"), release("2")]} albums={[]} />
    )
    await act(() => {
      slider.emit("pointerDown")
      slider.emit("scroll")
    })
    await act(() => vi.advanceTimersByTimeAsync(14000))
    expect(slider.api.scrollNext).not.toHaveBeenCalled()
    await act(() => {
      slider.api.scrollTo(1)
      slider.emit("pointerUp")
      slider.emit("scroll")
    })
    expect(
      container
        .querySelector('[aria-current="true"]')
        ?.getAttribute("aria-label")
    ).toBe("Aller au projet 2")
    await act(() => vi.advanceTimersByTimeAsync(14000))
    expect(slider.api.scrollNext).not.toHaveBeenCalled()
    await act(() => slider.emit("settle"))
    await act(() => vi.advanceTimersByTimeAsync(6999))
    expect(slider.api.scrollNext).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(slider.api.scrollNext).toHaveBeenCalledTimes(1)
  })
  it("updates the blurred artwork while the pointer is still held and before Embla selects a new target", async () => {
    await render(
      <ReleaseSlider
        songs={[
          { ...release("2"), artworkUrl: "/cover-two.jpg" },
          { ...release("1"), artworkUrl: "/cover-one.jpg" },
        ]}
        albums={[]}
      />
    )
    const region = container.querySelector<HTMLElement>('[role="region"]')!
    vi.spyOn(slider.api, "rootNode").mockReturnValue(region)
    vi.spyOn(region, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, width: 400 })
    )
    const slides = Array.from(
      container.querySelectorAll<HTMLElement>("[data-test-slide]")
    )
    vi.spyOn(slides[0]!, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: -250, width: 400 })
    )
    vi.spyOn(slides[1]!, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 150, width: 400 })
    )
    await act(() => {
      slider.emit("pointerDown")
      slider.emit("scroll")
    })
    expect(slider.api.selectedScrollSnap()).toBe(0)
    const blur = Array.from(container.querySelectorAll("img")).filter((img) =>
      img.classList.contains("blur-[70px]")
    )
    expect(blur).toHaveLength(1)
    expect(blur[0]?.getAttribute("src")).toBe("/cover-one.jpg")
    expect(
      container
        .querySelector('[aria-current="true"]')
        ?.getAttribute("aria-label")
    ).toBe("Aller au projet 2")
  })
  it("bounds selection, sorts existing releases and respects reduced motion", async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    await render(
      <ReleaseSlider
        songs={Array.from({ length: 9 }, (_, i) => release(String(i)))}
        albums={[]}
      />
    )
    expect(container.querySelectorAll("article")).toHaveLength(6)
    expect(container.querySelector("h2")?.textContent).toBe("Title 8")
    await act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Aller au projet 2"]')!
        .click()
    )
    expect(slider.api.scrollTo).toHaveBeenCalledWith(1, true)
  })
})
