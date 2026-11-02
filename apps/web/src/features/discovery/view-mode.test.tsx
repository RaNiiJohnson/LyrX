// @vitest-environment happy-dom
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LocaleProvider } from "@/app/locale-provider"
import { SongCollection } from "./discovery-cards"
import { useViewMode, ViewModeToggle } from "./view-mode"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, ...props }: ComponentProps<"a"> & { to: string }) => (
    <a href={to} {...props} />
  ),
}))

const songs = [
  {
    id: "s1",
    origin: "artist" as const,
    title: "Lanitra manga",
    primaryArtist: "Rija",
    artworkUrl: null,
    href: "/songs/s1",
    albumTitle: "Nosy",
    likeCount: 12,
  },
  {
    id: "c1",
    origin: "community" as const,
    title: "Tsiky",
    primaryArtist: "Rija",
    artworkUrl: null,
    href: "/community/c1",
    albumTitle: null,
    likeCount: 0,
  },
]

function Screen() {
  const [mode, setMode] = useViewMode()
  return (
    <>
      <ViewModeToggle mode={mode} onChange={setMode} />
      <SongCollection mode={mode} songs={songs} />
    </>
  )
}

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
async function render() {
  await act(async () => {
    root.render(
      <LocaleProvider>
        <Screen />
      </LocaleProvider>
    )
    await Promise.resolve()
  })
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe("cards or list view", () => {
  it("starts with cards, switches to rows and remembers the choice", async () => {
    await render()
    expect(host.querySelector("ul")).toBeNull()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="Liste"]')?.click()
      await Promise.resolve()
    })
    const rows = [...host.querySelectorAll("ul > li")]
    expect(rows).toHaveLength(2)
    expect(rows[0]?.textContent).toContain("Rija · Nosy")
    expect(rows[0]?.querySelector('[aria-label="12 j’aime"]')).not.toBeNull()
    expect(rows[1]?.textContent).toContain("Rija · Single")
    expect(rows[1]?.textContent).toContain("Communauté")
    expect(window.localStorage.getItem("lyrx-view-mode")).toBe("list")

    act(() => root.unmount())
    root = createRoot(host)
    await render()
    expect(host.querySelectorAll("ul > li")).toHaveLength(2)
  })
})
