// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "@/app/locale-provider"
import { PublicProfile } from "@/features/profile/public-profile"

const state = vi.hoisted(() => ({ banner: "/broken-banner.webp" }))
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => ({
    data: {
      role: "artist",
      handle: "artist",
      displayName: "Artist",
      avatarUrl: null,
      bio: "",
      artist: { bannerUrl: state.banner },
    },
  }),
}))
vi.mock("convex/react", () => ({ useQuery: () => undefined }))

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
async function render() {
  await act(async () => {
    root.render(
      <LocaleProvider>
        <PublicProfile handle="artist" />
      </LocaleProvider>
    )
    await Promise.resolve()
  })
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  state.banner = "/broken-banner.webp"
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
  it("discards a failed image's hidden state when a new URL arrives", async () => {
    await render()
    const broken = container.querySelector<HTMLImageElement>("img")
    expect(broken?.getAttribute("src")).toBe("/broken-banner.webp")
    await act(async () => {
      broken?.dispatchEvent(new Event("error"))
      await Promise.resolve()
    })
    expect(broken?.hidden).toBe(true)
    state.banner = "/replacement-banner.webp"
    await render()
    const replacement = container.querySelector<HTMLImageElement>("img")
    expect(replacement).not.toBe(broken)
    expect(replacement?.getAttribute("src")).toBe("/replacement-banner.webp")
    expect(replacement?.hidden).toBe(false)
    expect(container.querySelector("h1")?.textContent).toBe("Artist")
  })
})
