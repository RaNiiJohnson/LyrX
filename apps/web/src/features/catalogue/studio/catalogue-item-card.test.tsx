// @vitest-environment happy-dom
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LocaleProvider } from "@/app/locale-provider"
import { AlbumCard, SongCard } from "./catalogue-item-card"

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }))
vi.mock("convex/react", () => ({ useMutation: () => mocks.mutate }))
vi.mock("@lyrx/ui/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params: _params,
    ...props
  }: ComponentProps<"a"> & { to: string; params?: unknown }) => (
    <a href={to} {...props} />
  ),
}))

const now = Date.now()
const song = (status: "draft" | "published") =>
  ({
    _id: "song-1",
    _creationTime: now,
    status,
    title: "Lanitra manga",
    primaryArtist: "Rija",
    albumId: "album-1",
    albumTitle: "Nosy",
    artworkUrl: "https://example.com/art.webp",
    likeCount: 12,
    updatedAt: now - 5 * 86_400_000,
  }) as never

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
async function render(node: React.ReactNode) {
  await act(async () => {
    root.render(<LocaleProvider>{node}</LocaleProvider>)
    await Promise.resolve()
  })
}
const buttons = () =>
  [...host.querySelectorAll<HTMLButtonElement>("button")].map((button) =>
    button.textContent.trim()
  )

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  mocks.mutate.mockReset().mockResolvedValue(null)
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe("studio catalogue rows", () => {
  it("keeps Publish visible on a draft at every width", async () => {
    await render(<SongCard song={song("draft")} />)
    const publish = [...host.querySelectorAll("button")].find(
      (button) => button.textContent.trim() === "Publier"
    )
    expect(publish?.className).not.toContain("hidden")
    await act(async () => {
      publish?.click()
      await Promise.resolve()
    })
    expect(mocks.mutate).toHaveBeenCalledWith({ songId: "song-1" })
    expect(host.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/art.webp"
    )
    expect(host.textContent).toContain("Nosy · Modifié il y a 5 jours")
    // Likes only matter once the song is public.
    expect(host.querySelector('[aria-label="12 j’aime"]')).toBeNull()
  })

  it("keeps Unpublish behind the menu and shows likes for a published song", async () => {
    await render(<SongCard song={song("published")} />)
    expect(buttons()).not.toContain("Dépublier")
    expect(buttons()).not.toContain("Publier")
    expect(host.querySelector('[aria-label="12 j’aime"]')).not.toBeNull()
  })

  it("summarizes an album with its track count", async () => {
    await render(
      <AlbumCard
        album={
          {
            _id: "album-1",
            _creationTime: now,
            status: "published",
            title: "Nosy",
            artworkUrl: null,
            trackCount: 3,
            updatedAt: now,
          } as never
        }
      />
    )
    expect(host.textContent).toContain("3 morceaux · Modifié")
  })
})
