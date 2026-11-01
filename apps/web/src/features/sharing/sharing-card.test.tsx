// @vitest-environment happy-dom
import type * as RendererModule from "./card-renderer"
import type * as DownloadModule from "./download-card"
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest"
import { getFunctionName } from "convex/server"
import type * as RouterModule from "@tanstack/react-router"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { LocaleProvider } from "@/app/locale-provider"
import { CreateSharingCard, SharingDialog } from "./sharing-card"

const state = vi.hoisted(() => ({
  ready: true,
  unavailable: false,
  changed: false,
  check: vi.fn<(...args: Array<unknown>) => Promise<unknown>>(),
  download: vi.fn(),
  render: vi.fn<(...args: Array<unknown>) => Promise<HTMLCanvasElement>>(),
  card: {
    text: "Saved words",
    title: "Song",
    primaryArtist: "Artist",
    version: "v1",
    artworkId: null,
    artworkUrl: null,
  },
}))
vi.mock("convex-helpers/react/cache", () => ({
  useQuery: () => ({ state: state.ready ? "ready" : "anonymous" }),
}))
vi.mock("convex/react", () => ({
  useConvex: () => ({ query: state.check }),
  useQuery: (ref: Parameters<typeof getFunctionName>[0], args: unknown) =>
    args === "skip"
      ? undefined
      : getFunctionName(ref) === "sharing:context"
        ? state.unavailable
          ? null
          : state.changed
            ? { state: "changed", href: "/songs/current" }
            : {
                state: "ready",
                text: "Saved words",
                version: "v1",
                title: "Song",
                primaryArtist: "Artist",
                href: "/songs/current",
                hasArtwork: false,
              }
        : state.card,
}))
vi.mock("./card-renderer", async (original) => ({
  ...(await original<typeof RendererModule>()),
  renderCard: (...args: Array<unknown>) => state.render(...args),
  cardBlob: () => Promise.resolve(new Blob(["PNG"], { type: "image/png" })),
}))
vi.mock("./download-card", async (original) => ({
  ...(await original<typeof DownloadModule>()),
  downloadPng: (...args: Array<unknown>) => state.download(...args),
}))
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof RouterModule>()),
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))
let container: HTMLDivElement, root: ReturnType<typeof createRoot>
const target = {
  kind: "passage" as const,
  passageId: "passage-id" as Id<"notebookPassages">,
}
async function render(node: ReactNode) {
  await act(() => root.render(<LocaleProvider>{node}</LocaleProvider>))
}
async function click(label: string) {
  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button")
  ).find((row) => row.textContent.trim() === label)
  expect(button).toBeTruthy()
  await act(() => button!.click())
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  localStorage.clear()
  state.ready = true
  state.unavailable = false
  state.changed = false
  state.check.mockReset()
  state.check.mockResolvedValue(state.card)
  state.download.mockReset()
  state.render.mockReset()
  state.render.mockImplementation(() =>
    Promise.resolve(document.createElement("canvas"))
  )
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})
describe("sharing card dialog", () => {
  it("previews saved passages and checks current eligibility twice before downloading", async () => {
    await render(
      <SharingDialog
        target={target}
        onClose={vi.fn()}
        onReturnFocus={vi.fn()}
      />
    )
    expect(document.querySelector('canvas[role="img"]')).toBeTruthy()
    await click("Télécharger en PNG")
    expect(state.check).toHaveBeenCalledTimes(2)
    expect(state.download).toHaveBeenCalledWith(expect.any(Blob), "Song")
  })
  it("refuses to download when withdrawal happens after PNG encoding", async () => {
    state.check.mockResolvedValueOnce(state.card).mockResolvedValueOnce(null)
    await render(
      <SharingDialog
        target={target}
        onClose={vi.fn()}
        onReturnFocus={vi.fn()}
      />
    )
    await click("Télécharger en PNG")
    expect(state.check).toHaveBeenCalledTimes(2)
    expect(state.download).not.toHaveBeenCalled()
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "n’est plus disponible"
    )
  })
  it("cancels in-flight export when the dialog closes", async () => {
    let finish: ((value: unknown) => void) | undefined
    state.check.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    await render(
      <SharingDialog
        target={target}
        onClose={vi.fn()}
        onReturnFocus={vi.fn()}
      />
    )
    await click("Télécharger en PNG")
    await render(<div />)
    await act(() => finish?.(state.card))
    expect(state.download).not.toHaveBeenCalled()
  })
  it("hides unavailable content and requires a fresh selection for changed notebook snapshots", async () => {
    state.changed = true
    await render(
      <SharingDialog
        target={target}
        onClose={vi.fn()}
        onReturnFocus={vi.fn()}
      />
    )
    expect(document.querySelector('a[href="/songs/current"]')).toBeTruthy()
    expect(document.querySelector("canvas")).toBeNull()
    state.changed = false
    state.unavailable = true
    await render(
      <SharingDialog
        target={target}
        onClose={vi.fn()}
        onReturnFocus={vi.fn()}
      />
    )
    expect(document.querySelector("textarea")).toBeNull()
    expect(document.querySelector("canvas")).toBeNull()
  })
  it("gates anonymous visitors and restores focus after explicit opening/cancellation", async () => {
    state.ready = false
    await render(<CreateSharingCard target={target} />)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    const trigger = container.querySelector("button")!
    await click("Créer une carte")
    expect(document.querySelector('a[href="/account"]')).toBeTruthy()
    expect(state.render).not.toHaveBeenCalled()
    await click("Fermer")
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
  })
  it("blocks download when layout would clip the text or artwork cannot be loaded", async () => {
    const { CardRenderError } = await import("./card-renderer")
    state.render.mockRejectedValue(new CardRenderError("text"))
    await render(
      <SharingDialog
        target={target}
        onClose={vi.fn()}
        onReturnFocus={vi.fn()}
      />
    )
    expect(document.body.textContent).toContain("aucun texte ne sera coupé")
    const button = Array.from(document.querySelectorAll("button")).find(
      (row) => row.textContent === "Télécharger en PNG"
    )!
    expect(button.disabled).toBe(true)
    expect(state.download).not.toHaveBeenCalled()
  })
  it("updates the selection from the native select event without waiting for another click", async () => {
    const songTarget = {
      kind: "song" as const,
      sourceId: "song-id" as Id<"songs">,
    }
    await render(
      <SharingDialog
        target={songTarget}
        onClose={vi.fn()}
        onReturnFocus={vi.fn()}
      />
    )
    const input = document.querySelector("textarea")!
    await act(() => {
      input.focus()
      input.setSelectionRange(0, 5)
      input.dispatchEvent(new Event("select", { bubbles: true }))
    })
    expect(document.body.textContent).toContain(
      "5 / 360 caractères sélectionnés"
    )
    expect(document.querySelector('canvas[role="img"]')).toBeTruthy()
  })
  it("updates during mouse selection instead of deferring until mouseup or deselection", async () => {
    const songTarget = {
      kind: "song" as const,
      sourceId: "song-id" as Id<"songs">,
    }
    await render(
      <SharingDialog
        target={songTarget}
        onClose={vi.fn()}
        onReturnFocus={vi.fn()}
      />
    )
    const input = document.querySelector("textarea")!
    await act(() => {
      input.focus()
      input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
      input.setSelectionRange(0, 5)
      document.dispatchEvent(new Event("selectionchange"))
    })
    expect(document.body.textContent).toContain(
      "5 / 360 caractères sélectionnés"
    )
    expect(document.querySelector('canvas[role="img"]')).toBeTruthy()
    await act(() =>
      input.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
    )
    await act(() => {
      document
        .querySelector<HTMLButtonElement>('button[type="button"]')
        ?.focus()
      document.dispatchEvent(new Event("selectionchange"))
    })
    expect(document.body.textContent).toContain(
      "5 / 360 caractères sélectionnés"
    )
    await act(() => {
      input.focus()
      input.setSelectionRange(0, 0)
      input.dispatchEvent(
        new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true })
      )
    })
    expect(document.body.textContent).toContain(
      "0 / 360 caractères sélectionnés"
    )
    expect(document.querySelector('canvas[role="img"]')).toBeNull()
  })
})
