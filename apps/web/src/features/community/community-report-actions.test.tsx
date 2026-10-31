// @vitest-environment happy-dom
import type * as RouterModule from "@tanstack/react-router"

import { LocaleProvider } from "@/app/locale-provider"
import { CommunityReader } from "@/test/route-screens"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/features/interactions/song-interactions", () => ({
  SongInteractions: () => null,
}))

vi.mock("@/features/discovery/record-public-view", () => ({
  RecordPublicView: () => null,
}))

type ReportMocks = {
  current: undefined | { state: string; profile?: { handle: string } }
  report: ReturnType<typeof vi.fn<(...args: Array<unknown>) => Promise<void>>>
  success: ReturnType<typeof vi.fn<() => void>>
  readOnly: ReturnType<typeof vi.fn<(props: unknown) => void>>
}
const mocks = vi.hoisted<ReportMocks>(() => ({
  current: { state: "ready", profile: { handle: "another-fan" } },
  report: vi.fn<(...args: Array<unknown>) => Promise<void>>(),
  success: vi.fn(),
  readOnly: vi.fn(),
}))
vi.mock("convex/react", () => ({
  useQuery: () => mocks.current,
  useMutation: () => mocks.report,
}))
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof RouterModule>()),
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}))
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => ({
    data: {
      title: "A shared song",
      primaryArtist: "An artist",
      lyricsText: "Original lyric text",
      contributor: { handle: "author", displayName: "The credited Fan" },
      artworkUrl: "https://example.com/cover.webp",
      description: "Context from a Fan",
      guestArtists: ["Guest"],
      writers: ["Writer"],
      composers: ["Composer"],
      producers: ["Producer"],
      listeningLinks: [
        {
          provider: "youtube",
          url: "https://www.youtube.com/watch?v=abcdefghijk",
        },
      ],
      releaseDate: Date.UTC(2026, 0, 1),
      albumTitle: "An album",
      label: "A label",
    },
  }),
}))
vi.mock("@/features/catalogue/song/song-read-only", () => ({
  SongReadOnly: (props: unknown) => {
    mocks.readOnly(props)
    return <article>Original lyric text</article>
  },
}))
vi.mock("@lyrx/ui/lib/toast", () => ({ toast: { success: mocks.success } }))

const contributionId = "a-public-contribution" as Id<"communityContributions">
let root: ReturnType<typeof createRoot>
async function flush(work: () => void) {
  await act(async () => {
    work()
    await Promise.resolve()
  })
}
async function render() {
  await flush(() =>
    root.render(
      <LocaleProvider>
        <CommunityReader contributionId={contributionId} />
      </LocaleProvider>
    )
  )
}
function button(label: string) {
  const result = Array.from(document.querySelectorAll("button")).find(
    (node) =>
      node.textContent === label || node.getAttribute("aria-label") === label
  )
  if (!result) throw new Error(`Missing button: ${label}`)
  return result
}
async function openMenu() {
  await flush(() =>
    button("Options de la contribution").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    )
  )
}
async function openReport() {
  await openMenu()
  const item = document.querySelector<HTMLElement>('[role="menuitem"]')
  expect(item?.textContent).toContain("Signaler cette contribution")
  await flush(() => item?.click())
}
async function fillReason(value: string) {
  const textarea = document.querySelector<HTMLTextAreaElement>("#reportReason")
  if (!textarea) throw new Error("Missing report reason")
  await flush(() => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )?.set?.call(textarea, value)
    textarea.dispatchEvent(new Event("input", { bubbles: true }))
    textarea.dispatchEvent(new Event("change", { bubbles: true }))
  })
}
function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  mocks.current = { state: "ready", profile: { handle: "another-fan" } }
  mocks.report.mockReset().mockResolvedValue(undefined)
  mocks.success.mockReset()
  mocks.readOnly.mockClear()
  const container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await render()
})
afterEach(async () => {
  await flush(() => root.unmount())
  document.body.innerHTML = ""
  vi.unstubAllGlobals()
})

describe("community top report actions", () => {
  it("never offers reporting on the current author's own post", async () => {
    mocks.current = { state: "ready", profile: { handle: "author" } }
    await render()
    expect(document.body.textContent).toContain("Original lyric text")
    expect(
      document.querySelector('[aria-label="Options de la contribution"]')
    ).toBeNull()
    expect(document.querySelector("form")).toBeNull()
  })

  it("places the action before lyrics and opens an accessible dialog only on explicit selection", async () => {
    const trigger = button("Options de la contribution")
    const lyric = document.querySelector("article")!
    expect(
      trigger.compareDocumentPosition(lyric) & Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0)
    expect(document.querySelector("form")).toBeNull()
    await openReport()
    expect(
      document.querySelector('[role="dialog"]')?.getAttribute("aria-labelledby")
    ).toBeTruthy()
    expect(
      document.querySelector<HTMLTextAreaElement>("#reportReason")?.required
    ).toBe(true)
    expect(document.body.textContent).toContain("Original lyric text")
    await flush(() => button("Annuler").click())
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(mocks.report).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(trigger)
  })

  it("rejects blank and whitespace reasons before contacting the server", async () => {
    await openReport()
    await fillReason("   \n  ")
    await flush(() =>
      document
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        )
    )
    expect(mocks.report).not.toHaveBeenCalled()
    expect(document.querySelector('[aria-invalid="true"]')).not.toBeNull()
  })

  it("keeps genuine errors and the reason, permits retry, and prevents closing or double submit while pending", async () => {
    await openReport()
    await fillReason("A specific report reason")
    const operation = deferred()
    mocks.report.mockReturnValueOnce(operation.promise)
    await flush(() => button("Signaler cette contribution").click())
    expect(mocks.report).toHaveBeenCalledExactlyOnceWith({
      contributionId,
      reason: "A specific report reason",
    })
    expect(button("Annuler").disabled).toBe(true)
    expect(button("Signaler cette contribution").disabled).toBe(true)
    await flush(() => {
      document
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        )
      document
        .querySelector('[role="dialog"]')
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        )
    })
    expect(mocks.report).toHaveBeenCalledOnce()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    await act(async () => {
      operation.reject(new Error("RATE_LIMITED"))
      await operation.promise.catch(() => undefined)
    })
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
    expect(
      document.querySelector<HTMLTextAreaElement>("#reportReason")?.value
    ).toBe("A specific report reason")
    expect(button("Signaler cette contribution").disabled).toBe(false)
    await flush(() => button("Signaler cette contribution").click())
    expect(mocks.report).toHaveBeenCalledTimes(2)
    expect(mocks.success).toHaveBeenCalledOnce()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it("shows an account skeleton without a sign-in flash, then offers sign-in inside options to anonymous readers", async () => {
    mocks.current = undefined
    await render()
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(document.body.textContent).not.toContain("Connectez-vous")
    mocks.current = { state: "anonymous" }
    await render()
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull()
    expect(document.querySelector("form")).toBeNull()
    await openMenu()
    expect(document.querySelector('[role="menuitem"]')?.textContent).toContain(
      "Connectez-vous"
    )
  })

  it("passes cover and rich optional metadata to the shared public reader", () => {
    expect(mocks.readOnly).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          artworkUrl: "https://example.com/cover.webp",
          album: { title: "An album" },
          song: expect.objectContaining({
            description: "Context from a Fan",
            guestArtists: ["Guest"],
            writers: ["Writer"],
            composers: ["Composer"],
            producers: ["Producer"],
            label: "A label",
            listeningLinks: [
              {
                provider: "youtube",
                url: "https://www.youtube.com/watch?v=abcdefghijk",
              },
            ],
          }),
        }),
      })
    )
  })
})

vi.mock("@/app/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => children,
}))
