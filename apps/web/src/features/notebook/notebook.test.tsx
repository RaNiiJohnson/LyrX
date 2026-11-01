// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest"
import type * as RouterModule from "@tanstack/react-router"
import { getFunctionName } from "convex/server"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { LocaleProvider } from "@/app/locale-provider"
import { SavePassage } from "./save-passage"
import { NotebookPassages } from "./notebook-passages"
import { NotebookCollections } from "./notebook-collections"
import { CollectionDialog } from "./collection-dialog"

const state = vi.hoisted(() => ({
  ready: true,
  mutation: vi.fn<(...args: Array<unknown>) => Promise<unknown>>(),
  results: [] as Array<Record<string, unknown>>,
  status: "Exhausted",
  loadMore: vi.fn(),
}))
vi.mock("convex-helpers/react/cache", () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(ref) === "members:current"
      ? { state: state.ready ? "ready" : "anonymous" }
      : [],
  usePaginatedQuery: () => ({
    results: state.results,
    status: state.status,
    loadMore: state.loadMore,
  }),
}))
vi.mock("convex/react", () => ({
  useMutation:
    (ref: Parameters<typeof getFunctionName>[0]) => (args: unknown) =>
      state.mutation(getFunctionName(ref), args),
}))
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof RouterModule>()),
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))
vi.mock("@lyrx/ui/lib/toast", () => ({ toast: { success: vi.fn() } }))
let container: HTMLDivElement, root: ReturnType<typeof createRoot>
const sourceId = "test-song" as Id<"songs">
async function render(node: ReactNode) {
  await act(() => root.render(<LocaleProvider>{node}</LocaleProvider>))
}
async function click(text: string) {
  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button")
  ).find((b) => b.textContent.trim() === text)
  expect(button).toBeTruthy()
  await act(() => button!.click())
}
async function submit() {
  await act(() =>
    document
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  )
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  state.ready = true
  state.results = []
  state.status = "Exhausted"
  state.mutation.mockReset()
  state.mutation.mockResolvedValue("created-collection")
  state.loadMore.mockReset()
  localStorage.clear()
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})
describe("notebook journeys", () => {
  it("opens only explicitly, saves the exact repeated range, and restores focus after closing", async () => {
    await render(<SavePassage sourceId={sourceId} lyricsText="echo echo" />)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    const trigger = container.querySelector("button")!
    await click("Enregistrer un passage")
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      "Choisir un passage"
    )
    const input = document.querySelector("textarea")!
    expect(input.readOnly).toBe(true)
    expect(
      Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent === "Enregistrer"
      )?.disabled
    ).toBe(true)
    await act(() => {
      input.focus()
      input.setSelectionRange(5, 9)
      input.dispatchEvent(
        new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true })
      )
    })
    expect(document.querySelector("blockquote")?.textContent).toBe("echo")
    await submit()
    expect(state.mutation).toHaveBeenCalledWith("notebook/write:save", {
      sourceId,
      sourceText: "echo echo",
      start: 5,
      end: 9,
      collectionId: null,
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
  })
  it("preserves selection and shows a localized source conflict, allowing a retry", async () => {
    state.mutation.mockRejectedValueOnce({
      data: { code: "NOTEBOOK_SOURCE_CHANGED" },
    })
    await render(
      <SavePassage sourceId={sourceId} lyricsText="Original lyrics" />
    )
    await click("Enregistrer un passage")
    const input = document.querySelector("textarea")!
    await act(() => {
      input.focus()
      input.setSelectionRange(0, 8)
      input.dispatchEvent(
        new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true })
      )
    })
    await submit()
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Les paroles ont changé"
    )
    expect(document.querySelector("blockquote")?.textContent).toBe("Original")
    await submit()
    expect(state.mutation).toHaveBeenCalledTimes(2)
  })
  it("requires sign-in and performs no notebook mutation for anonymous visitors", async () => {
    state.ready = false
    await render(<SavePassage sourceId={sourceId} lyricsText="Public text" />)
    await click("Enregistrer un passage")
    expect(document.querySelector("textarea")).toBeNull()
    expect(document.querySelector('a[href="/account"]')).toBeTruthy()
    expect(state.mutation).not.toHaveBeenCalled()
  })
  it("marks saved old text, renders withdrawn cards without source content and paginates", async () => {
    state.results = [
      {
        id: "old",
        collectionId: null,
        savedAt: 0,
        state: "changed",
        text: "Saved old words",
        source: {
          href: "/songs/example",
          title: "Title",
          primaryArtist: "Artist",
          artworkUrl: null,
        },
      },
      {
        id: "withdrawn",
        collectionId: null,
        savedAt: 0,
        state: "unavailable",
        text: null,
        source: null,
      },
    ]
    state.status = "CanLoadMore"
    await render(<NotebookPassages filter="all" collections={[]} />)
    expect(container.textContent).toContain(
      "Paroles modifiées depuis l’enregistrement"
    )
    expect(container.textContent).toContain("pas les paroles actuelles")
    expect(container.querySelectorAll('a[href="/songs/example"]')).toHaveLength(
      1
    )
    expect(container.querySelectorAll("blockquote")).toHaveLength(1)
    expect(container.textContent).toContain("Source indisponible")
    await click("Voir la suite")
    expect(state.loadMore).toHaveBeenCalledWith(12)
  })
  it("creates collections even without an onCreated callback", async () => {
    await render(<CollectionDialog onClose={vi.fn()} />)
    const input = document.querySelector("input")!
    await act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )!.set!.call(input, "Travel")
      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await submit()
    expect(state.mutation).toHaveBeenCalledWith(
      "notebook/write:createCollection",
      { name: "Travel" }
    )
  })
  it("returns keyboard focus to the collection trigger after cancellation", async () => {
    await render(
      <NotebookCollections collections={[]} value="all" onChange={vi.fn()} />
    )
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Nouvelle collection"]'
    )!
    await act(() => trigger.click())
    await click("Annuler")
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(state.mutation).not.toHaveBeenCalled()
  })
})
