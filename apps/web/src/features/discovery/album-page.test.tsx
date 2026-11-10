// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "@/app/locale-provider"
import { Route } from "@/routes/albums/$albumId"

const state: { detail: unknown } = vi.hoisted(() => ({ detail: null }))
vi.mock("@convex-dev/react-query", () => ({ convexQuery: () => ({}) }))
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => ({ data: state.detail }),
}))
vi.mock("@/app/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock("@/app/back-button", () => ({ BackButton: () => null }))
vi.mock("@/app/route-states", () => ({ appRouteBoundaries: {} }))
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    children: ReactNode
    to: string
    params?: Record<string, string>
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to
      )}
      {...props}
    >
      {children}
    </a>
  ),
  notFound: () => new Error("not found"),
  createFileRoute: () => (options: { component: () => ReactNode }) => ({
    ...options,
    useParams: () => ({ albumId: "album1" }),
  }),
}))

const song = (id: string, title: string) => ({
  _id: id,
  title,
  primaryArtist: "Mina",
})
const detail = (genre: string) => ({
  album: { genre, credits: [], title: "Nocturnes", status: "published" },
  artist: { displayName: "Mina Rivers", handle: "mina" },
  artworkUrl: null,
  tracks: [
    { position: 0, song: song("s1", "One") },
    { position: 1, song: song("s2", "Two") },
  ],
})

let root: ReturnType<typeof createRoot>
let container: HTMLDivElement
async function render() {
  const Page = (Route as unknown as { component: () => ReactNode }).component
  await act(async () => {
    root.render(
      <LocaleProvider>
        <Page />
      </LocaleProvider>
    )
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
})

describe("public album page", () => {
  it("links to the artist profile, counts tracks and translates the genre", async () => {
    state.detail = detail("hip-hop")
    await render()
    const artist = container.querySelector<HTMLAnchorElement>(
      'a[href="/artists/mina"]'
    )
    expect(artist?.textContent).toBe("Mina Rivers")
    expect(container.querySelector("header")?.textContent).toContain("2 titres")
    expect(container.textContent).toContain("Hip-hop")
    expect(container.textContent).not.toContain("hip hop")
  })
})
