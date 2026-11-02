// @vitest-environment happy-dom
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LocaleProvider } from "@/app/locale-provider"
import { AlbumTrackNavigation } from "./album-track-navigation"

const state = vi.hoisted((): { album: unknown } => ({ album: undefined }))
vi.mock("convex-helpers/react/cache", () => ({
  useQuery: (_fn: unknown, args: unknown) =>
    args === "skip" ? undefined : state.album,
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    ...props
  }: ComponentProps<"a"> & { to: string; params?: Record<string, string> }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (href, [key, value]) => href.replace(`$${key}`, value),
        to
      )}
      {...props}
    />
  ),
}))

const track = (position: number, id: string, title: string) => ({
  position,
  song: { _id: id, title },
})
const album = {
  album: { _id: "album-1", title: "Nosy" },
  artworkUrl: null,
  tracks: [
    track(1, "s1", "Lanitra manga"),
    track(2, "s2", "Ho anao ny foko"),
    track(3, "s3", "Tsiky an-dalana"),
  ],
}

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
async function render(albumId: string | undefined, songId: string) {
  await act(async () => {
    root.render(
      <LocaleProvider>
        <AlbumTrackNavigation
          albumId={albumId as never}
          songId={songId as never}
        />
      </LocaleProvider>
    )
    await Promise.resolve()
  })
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  state.album = album
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe("album track navigation on a song page", () => {
  it("lists the album tracks and marks the song being read", async () => {
    await render("album-1", "s2")
    const rail = host.querySelector("aside")!
    const links = [...rail.querySelectorAll("ol a")]
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/songs/s1",
      "/songs/s2",
      "/songs/s3",
    ])
    expect(links[1]?.getAttribute("aria-current")).toBe("page")
    expect(rail.textContent).toContain("Morceau 2 sur 3")
    expect(
      rail
        .querySelector('a[aria-label="Morceau précédent"]')
        ?.getAttribute("href")
    ).toBe("/songs/s1")
    expect(
      rail
        .querySelector('a[aria-label="Morceau suivant"]')
        ?.getAttribute("href")
    ).toBe("/songs/s3")
    expect(rail.querySelector('a[href="/albums/album-1"]')).not.toBeNull()
  })

  it("disables the missing step at the ends of the album", async () => {
    await render("album-1", "s1")
    const rail = host.querySelector("aside")!
    expect(
      rail.querySelector<HTMLButtonElement>(
        'button[aria-label="Morceau précédent"]'
      )?.disabled
    ).toBe(true)
  })

  it("renders nothing for a single or a non-public album", async () => {
    await render(undefined, "s1")
    expect(host.innerHTML).toBe("")
    state.album = null
    await render("album-1", "s1")
    expect(host.innerHTML).toBe("")
  })
})
