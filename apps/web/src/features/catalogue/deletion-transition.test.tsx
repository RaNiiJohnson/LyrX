// @vitest-environment happy-dom

import { Component, act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import { LocaleProvider } from "@/app/locale-provider"
import { AlbumPreview } from "./album/album-preview"
import { SongPreview } from "./song/song-preview"

const harness = vi.hoisted(() => ({
  missing: false,
  revision: 0,
  listeners: new Set<() => void>(),
  navigate: vi.fn<(...args: Array<unknown>) => Promise<void>>(),
  mutate: vi.fn<(...args: Array<unknown>) => Promise<void>>(),
  error: vi.fn(),
  success: vi.fn(),
  reads: [] as Array<string>,
}))

// Feature tests stub reads; cache lifecycle is covered by backend-provider.test.tsx.
vi.mock("convex-helpers/react/cache", async () => {
  const convex = await import("convex/react")
  return convex
})
vi.mock("convex/react", async () => {
  const { useSyncExternalStore } = await import("react")
  const { getFunctionName } = await import("convex/server")
  const current = {
    state: "ready",
    member: { role: "artist" },
    profile: { displayName: "Test artist" },
  }
  const songDetail = {
    artworkUrl: null,
    lyricsText: "Required lyrics",
    song: {
      title: "Owned song",
      primaryArtist: "Test artist",
      composers: [],
      guestArtists: [],
      producers: [],
      writers: [],
      listeningLinks: [],
    },
  }
  const albumDetail = {
    artworkUrl: null,
    album: { title: "Owned album", status: "draft", credits: [] },
    trackCount: 0,
    tracks: [],
  }
  const paginated = { results: [], status: "Exhausted" }
  return {
    useMutation: () => harness.mutate,
    usePaginatedQuery: () => paginated,
    useQuery: (
      reference: Parameters<typeof getFunctionName>[0],
      args: unknown
    ) => {
      useSyncExternalStore(
        (listener) => {
          harness.listeners.add(listener)
          return () => harness.listeners.delete(listener)
        },
        () => harness.revision
      )
      if (args === "skip") return undefined
      const name = getFunctionName(reference)
      harness.reads.push(name)
      if (name === "members:current") {
        return current
      }
      if (harness.missing) throw new Error("NOT_FOUND")
      if (name.endsWith("getMySong")) {
        return songDetail
      }
      return albumDetail
    },
  }
})

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => harness.navigate,
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

vi.mock("@lyrx/ui/lib/toast", () => ({
  toast: { error: harness.error, success: harness.success },
}))

// Overlay positioning/focus is outside this regression. Keep their actual
// callbacks and visibility while exposing native DOM controls for interaction.
vi.mock("@lyrx/ui/components/alert-dialog", async () => {
  const { createContext, useContext } = await import("react")
  const OpenContext = createContext(false)
  const Container = ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  )
  const Action = ({
    children,
    disabled,
    onClick,
  }: React.ComponentProps<"button">) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
  return {
    AlertDialog: ({
      open,
      children,
    }: {
      open: boolean
      children: ReactNode
    }) => <OpenContext value={open}>{children}</OpenContext>,
    AlertDialogContent: ({ children }: { children: ReactNode }) =>
      useContext(OpenContext) ? <div role="dialog">{children}</div> : null,
    AlertDialogAction: Action,
    AlertDialogCancel: Action,
    AlertDialogDescription: Container,
    AlertDialogFooter: Container,
    AlertDialogHeader: Container,
    AlertDialogTitle: Container,
  }
})

vi.mock("@lyrx/ui/components/dropdown-menu", () => {
  const Container = ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  )
  return {
    DropdownMenu: Container,
    DropdownMenuContent: Container,
    DropdownMenuGroup: Container,
    DropdownMenuTrigger: Container,
    DropdownMenuSeparator: () => null,
    DropdownMenuItem: ({
      children,
      onSelect,
      asChild,
    }: {
      children: ReactNode
      onSelect?: () => void
      asChild?: boolean
    }) => (asChild ? children : <button onClick={onSelect}>{children}</button>),
  }
})

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

class QueryBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override render() {
    return this.state.failed ? (
      <div data-testid="query-error">Unavailable: NOT_FOUND</div>
    ) : (
      this.props.children
    )
  }
}

let container: HTMLDivElement
let root: Root

async function flush(work: () => void) {
  await act(async () => {
    work()
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  harness.missing = false
  harness.revision = 0
  harness.listeners.clear()
  harness.reads = []
  harness.navigate.mockReset()
  harness.mutate.mockReset()
  harness.error.mockReset()
  harness.success.mockReset()
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await flush(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function renderPreview(kind: "song" | "album", fromAlbum = false) {
  await flush(() => {
    root.render(
      <QueryBoundary>
        <LocaleProvider>
          {kind === "song" ? (
            <SongPreview
              songId={"song-test" as Id<"songs">}
              fromAlbumId={
                fromAlbum ? ("album-test" as Id<"albums">) : undefined
              }
            />
          ) : (
            <AlbumPreview albumId={"album-test" as Id<"albums">} />
          )}
        </LocaleProvider>
      </QueryBoundary>
    )
  })
}

async function confirmDelete() {
  const remove = [...container.querySelectorAll("button")].find(
    (button) => button.textContent.trim() === "Supprimer"
  )
  expect(remove).toBeDefined()
  await flush(() => remove!.click())
  const confirmation = container.querySelector('[role="dialog"]')
  expect(confirmation).not.toBeNull()
  const confirm = [...confirmation!.querySelectorAll("button")].find(
    (button) => button.textContent.trim() === "Supprimer"
  )
  expect(confirm).toBeDefined()
  await flush(() => confirm!.click())
}

async function invalidateAsDeleted() {
  await flush(() => {
    harness.missing = true
    harness.revision += 1
    for (const listener of harness.listeners) listener()
  })
}

describe.each(["song", "album"] as const)("%s deletion transition", (kind) => {
  it("never renders a missing-resource error between invalidation and navigation", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const mutation = deferred()
    const navigation = deferred()
    harness.mutate.mockReturnValue(mutation.promise)
    harness.navigate.mockReturnValue(navigation.promise)
    await renderPreview(kind)
    await confirmDelete()
    expect(harness.mutate).toHaveBeenCalledOnce()
    await invalidateAsDeleted()
    expect(container.querySelector('[data-testid="query-error"]')).toBeNull()
    expect(harness.navigate).not.toHaveBeenCalled()
    await flush(() => mutation.resolve())
    expect(harness.navigate).toHaveBeenCalledWith({
      to: "/studio",
      search: { tab: kind === "song" ? "songs" : "albums" },
    })
    await invalidateAsDeleted()
    expect(container.querySelector('[data-testid="query-error"]')).toBeNull()
    expect(harness.error).not.toHaveBeenCalled()
    await flush(() => navigation.resolve())
  })

  it("restores the live resource and displays a real mutation failure", async () => {
    const mutation = deferred()
    harness.mutate.mockReturnValue(mutation.promise)
    await renderPreview(kind)
    await confirmDelete()
    await flush(() => mutation.reject(new Error("Connection failed")))
    expect(harness.error).toHaveBeenCalledOnce()
    expect(harness.navigate).not.toHaveBeenCalled()
    expect(container.textContent).toContain(
      kind === "song" ? "Owned song" : "Owned album"
    )
    expect(container.querySelector('[data-testid="query-error"]')).toBeNull()
    const confirm = [
      ...container.querySelectorAll('[role="dialog"] button'),
    ].find((button) => button.textContent.trim() === "Supprimer")
    expect(confirm?.hasAttribute("disabled")).toBe(false)
    const readsBefore = harness.reads.length
    await flush(() => {
      harness.revision += 1
      for (const listener of harness.listeners) listener()
    })
    expect(harness.reads.length).toBeGreaterThan(readsBefore)
  })

  it("does not hide an ordinary missing-resource error outside deletion", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    harness.missing = true
    await renderPreview(kind)
    expect(
      container.querySelector('[data-testid="query-error"]')
    ).not.toBeNull()
    expect(harness.navigate).not.toHaveBeenCalled()
  })

  it("uses full navigation without resubscribing when client navigation fails after deletion", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const assign = vi
      .spyOn(window.location, "assign")
      .mockImplementation(() => {})
    const mutation = deferred()
    const navigation = deferred()
    harness.mutate.mockReturnValue(mutation.promise)
    harness.navigate.mockReturnValue(navigation.promise)
    await renderPreview(kind)
    await confirmDelete()
    await invalidateAsDeleted()
    await flush(() => mutation.resolve())
    await flush(() => navigation.reject(new Error("Route loader unavailable")))
    expect(assign).toHaveBeenCalledWith(
      `/studio?tab=${kind === "song" ? "songs" : "albums"}`
    )
    expect(container.querySelector('[data-testid="query-error"]')).toBeNull()
    const readsBefore = harness.reads.filter(
      (name) => name.endsWith("getMySong") || name.endsWith("getMyAlbum")
    ).length
    await invalidateAsDeleted()
    expect(
      harness.reads.filter(
        (name) => name.endsWith("getMySong") || name.endsWith("getMyAlbum")
      )
    ).toHaveLength(readsBefore)
    expect(harness.error).not.toHaveBeenCalled()
  })
})

it("returns a deleted album track to its parent album preview", async () => {
  const mutation = deferred()
  const navigation = deferred()
  harness.mutate.mockReturnValue(mutation.promise)
  harness.navigate.mockReturnValue(navigation.promise)
  await renderPreview("song", true)
  await confirmDelete()
  await flush(() => mutation.resolve())
  expect(harness.navigate).toHaveBeenCalledWith({
    to: "/studio/albums/$albumId/preview",
    params: { albumId: "album-test" },
  })
  await flush(() => navigation.resolve())
})
