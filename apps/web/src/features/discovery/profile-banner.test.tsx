// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "@/app/locale-provider"
import { PublicProfile } from "@/test/route-screens"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lyrx/ui/components/tabs"

const state = vi.hoisted<{ banner: string | null; ready: boolean }>(() => ({
  banner: "/broken-banner.webp",
  ready: false,
}))
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => ({
    data: {
      role: "artist",
      handle: "artist",
      displayName: "Artist",
      avatarUrl: null,
      bio: "",
      artist: { bannerUrl: state.banner, customLinks: [] },
    },
  }),
}))
// Feature tests stub reads; cache lifecycle is covered by backend-provider.test.tsx.
vi.mock("convex-helpers/react/cache", async () => {
  const convex = await import("convex/react")
  return convex
})
vi.mock("convex/react", () => ({
  useQuery: () =>
    state.ready
      ? {
          ready: true,
          songCount: 0,
          albumCount: 0,
          songs: [],
          albums: [],
        }
      : undefined,
}))

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
async function render(children: ReactNode = <PublicProfile handle="artist" />) {
  await act(async () => {
    root.render(<LocaleProvider>{children}</LocaleProvider>)
    await Promise.resolve()
  })
}
async function flush(action: () => void) {
  await act(async () => {
    action()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
function tabButtons() {
  return [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  state.banner = "/broken-banner.webp"
  state.ready = false
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe("public profile banner replacement", () => {
  it("overlaps only the avatar and removes the overlap after failure until a new URL arrives", async () => {
    await render()
    const broken = container.querySelector<HTMLImageElement>("img")
    expect(broken?.getAttribute("src")).toBe("/broken-banner.webp")
    const avatar = () => container.querySelector('[data-slot="avatar"]')
    expect(avatar()?.className).toContain("-mt-12")
    expect(avatar()?.className).toContain("sm:-mt-16")
    expect(avatar()?.className).toContain("ring-background")
    expect(container.querySelector("header")?.className).not.toContain("-mt-")
    const identity = container.querySelector("h1")?.parentElement?.parentElement
    expect(identity?.className).toContain("gap-1")
    expect(identity?.className).not.toContain("sm:pt-")
    await act(async () => {
      broken?.dispatchEvent(new Event("error"))
      await Promise.resolve()
    })
    expect(container.querySelector("img")).toBeNull()
    expect(avatar()?.className).not.toContain("-mt-")
    await render()
    expect(container.querySelector("img")).toBeNull()
    expect(avatar()?.className).not.toContain("-mt-")
    state.banner = "/replacement-banner.webp"
    await render()
    const replacement = container.querySelector<HTMLImageElement>("img")
    expect(replacement).not.toBe(broken)
    expect(replacement?.getAttribute("src")).toBe("/replacement-banner.webp")
    expect(replacement?.hidden).toBe(false)
    expect(avatar()?.className).toContain("-mt-12")
    expect(container.querySelector("h1")?.textContent).toBe("Artist")
  })
  it("has no phantom overlap when the artist has no banner", async () => {
    state.banner = null
    await render()
    expect(container.querySelector("img")).toBeNull()
    const avatar = container.querySelector('[data-slot="avatar"]')
    expect(avatar?.className).toContain("size-24")
    expect(avatar?.className).toContain("sm:size-32")
    expect(avatar?.className).not.toContain("-mt-")
    expect(container.querySelector("h1")?.textContent).toBe("Artist")
    state.banner = "/new-banner.webp"
    await render()
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "/new-banner.webp"
    )
    expect(
      container.querySelector('[data-slot="avatar"]')?.className
    ).toContain("-mt-12")
  })
  it("keeps the active line on the actual Radix state through clicking and arrow keys", async () => {
    state.ready = true
    await render()
    const [songs, albums, about] = tabButtons()
    expect(songs?.getAttribute("data-state")).toBe("active")
    expect(songs?.hasAttribute("data-active")).toBe(false)
    expect(songs?.className).toContain(
      "group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100"
    )
    expect(songs?.className).not.toContain("data-active:")
    expect(container.querySelector('[role="tablist"]')?.className).toContain(
      "border-b"
    )
    expect(container.querySelector('[role="tablist"]')?.className).toContain(
      "w-full"
    )
    for (const tab of tabButtons()) {
      expect(tab.className).toContain("flex-1")
      expect(tab.className).toContain("min-w-0")
      expect(tab.className).not.toContain("flex-none")
      expect(tab.querySelector("span")?.className).toContain("truncate")
    }
    await flush(() => {
      albums?.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, button: 0 })
      )
      albums?.focus()
      albums?.click()
    })
    expect(albums?.getAttribute("aria-selected")).toBe("true")
    expect(songs?.getAttribute("data-state")).toBe("inactive")
    await flush(() => {
      albums?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      )
    })
    expect(document.activeElement).toBe(about)
    expect(about?.getAttribute("data-state")).toBe("active")
    expect(albums?.getAttribute("data-state")).toBe("inactive")
    await flush(() => {
      about?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true })
      )
    })
    expect(document.activeElement).toBe(songs)
    expect(songs?.getAttribute("aria-selected")).toBe("true")
    expect(
      container.querySelectorAll('[role="tab"][data-state="active"]')
    ).toHaveLength(1)
  })
  it("retains the default tab background state used by Studio", async () => {
    await render(
      <Tabs defaultValue="songs">
        <TabsList>
          <TabsTrigger value="songs">Songs</TabsTrigger>
          <TabsTrigger value="albums">Albums</TabsTrigger>
        </TabsList>
        <TabsContent value="songs">Song list</TabsContent>
        <TabsContent value="albums">Album list</TabsContent>
      </Tabs>
    )
    const [songs, albums] = tabButtons()
    expect(
      container.querySelector('[role="tablist"]')?.getAttribute("data-variant")
    ).toBe("default")
    expect(songs?.getAttribute("data-state")).toBe("active")
    expect(songs?.className).toContain("data-[state=active]:bg-background")
    expect(songs?.className).toContain(
      "group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm"
    )
    await flush(() => {
      albums?.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, button: 0 })
      )
      albums?.focus()
      albums?.click()
    })
    expect(songs?.getAttribute("data-state")).toBe("inactive")
    expect(albums?.getAttribute("data-state")).toBe("active")
    expect(
      container.querySelector('[role="tabpanel"]:not([hidden])')?.textContent
    ).toBe("Album list")
  })
})

vi.mock("@/app/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => children,
}))
