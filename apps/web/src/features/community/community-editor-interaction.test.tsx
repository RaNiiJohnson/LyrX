// @vitest-environment happy-dom

import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { LocaleProvider } from "@/app/locale-provider"
import { CommunityEditor } from "./community-editor"

const harness = vi.hoisted(() => ({
  publish: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  navigate: vi.fn(),
  queryRevision: 1,
}))
vi.mock("convex/react", async () => {
  const { getFunctionName } = await import("convex/server")
  return {
    useQuery: (
      reference: Parameters<typeof getFunctionName>[0],
      args: unknown
    ) => {
      if (args === "skip") return undefined
      if (getFunctionName(reference) === "members:current")
        return { state: "ready", member: { role: "fan", isAdmin: false } }
      return {
        _id: "existing",
        status: "published",
        title: "Old title",
        primaryArtist: "Artist",
        lyricsText: "Original lyrics",
        revision: 7,
        genre: "rock",
        artworkUrl: null,
      }
    },
    useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
      getFunctionName(reference).endsWith(":publish")
        ? harness.publish
        : harness.update,
    useConvex: () => ({
      query: (reference: Parameters<typeof getFunctionName>[0]) =>
        Promise.resolve(
          getFunctionName(reference).endsWith(":getMine")
            ? {
                ...harness.publish.mock.calls[0]?.[0],
                revision: harness.queryRevision,
              }
            : []
        ),
    }),
  }
})
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  useNavigate: () => harness.navigate,
}))
vi.mock("./community-artwork-upload", () => ({
  uploadCommunityArtwork: harness.upload,
}))
vi.mock("@lyrx/ui/lib/toast", () => ({ toast: { success: vi.fn() } }))

let root: Root
let container: HTMLDivElement

beforeEach(() => {
  vi.resetAllMocks()
  harness.publish.mockResolvedValue("created")
  harness.queryRevision = 1
  harness.update.mockResolvedValue(null)
  harness.navigate.mockResolvedValue(undefined)
  harness.upload
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(undefined)
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:cover")
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  localStorage.clear()
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(() => {
    root.unmount()
    return Promise.resolve()
  })
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function render(existing = false) {
  await act(async () => {
    root.render(
      <LocaleProvider>
        <CommunityEditor
          contributionId={
            existing ? ("existing" as Id<"communityContributions">) : undefined
          }
        />
      </LocaleProvider>
    )
    await Promise.resolve()
  })
}

async function fill(name: string, value: string) {
  const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `[name="${name}"]`
  )!
  const prototype =
    input.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
    await Promise.resolve()
  })
}

async function chooseImage() {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
  await act(async () => {
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new File(["image"], "cover.png", { type: "image/png" })],
    })
    input.dispatchEvent(new Event("change", { bubbles: true }))
    await Promise.resolve()
  })
}

async function submit() {
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    await Promise.resolve()
  })
}

describe("community editor partial publication UI", () => {
  it("retains optional metadata across closed sections and sends an explicit genre clear", async () => {
    await render(true)
    const section = () =>
      Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent.includes("Sortie et présentation")
      )!
    await act(() => {
      section().click()
      return Promise.resolve()
    })
    await fill("albumTitle", "Album reference")
    await fill("description", "Optional description")
    await act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Supprimer Genre"]'
        )!
        .click()
      section().click()
      return Promise.resolve()
    })
    expect(container.querySelector('[name="albumTitle"]')).toBeNull()
    await act(() => {
      section().click()
      return Promise.resolve()
    })
    expect(
      container.querySelector<HTMLInputElement>('[name="albumTitle"]')!.value
    ).toBe("Album reference")
    await submit()
    expect(harness.update).toHaveBeenCalledWith(
      expect.objectContaining({
        albumTitle: "Album reference",
        description: "Optional description",
        clearGenre: true,
        clearReleaseDate: true,
      })
    )
  })

  it("retains the selected file and form after failed artwork, then retries without duplicate publication", async () => {
    await render()
    await fill("title", "New title")
    await fill("primaryArtist", "Artist")
    await fill("lyricsText", "  Raw\nlyrics\n")
    await chooseImage()
    await submit()
    expect(harness.publish).toHaveBeenCalledTimes(1)
    expect(harness.publish.mock.calls[0]![0]).toMatchObject({
      title: "New title",
      lyricsText: "  Raw\nlyrics\n",
    })
    expect(container.textContent).toContain("déjà publique")
    expect(
      container.querySelector<HTMLInputElement>('[name="title"]')!.value
    ).toBe("New title")
    expect(container.querySelector('img[src="blob:cover"]')).not.toBeNull()
    expect(harness.navigate).not.toHaveBeenCalled()
    await submit()
    expect(harness.publish).toHaveBeenCalledTimes(1)
    expect(harness.update).not.toHaveBeenCalled()
    expect(harness.upload).toHaveBeenCalledTimes(2)
    expect(harness.navigate).toHaveBeenCalledWith({
      to: "/community/$contributionId",
      params: { contributionId: "created" },
    })
  })

  it("does not re-update an existing contribution on image-only retry", async () => {
    await render(true)
    await fill("title", "Edited title")
    await chooseImage()
    await submit()
    expect(harness.update).toHaveBeenCalledTimes(1)
    expect(harness.update).toHaveBeenCalledWith(
      expect.objectContaining({
        contributionId: "existing",
        expectedRevision: 7,
      })
    )
    await submit()
    expect(harness.update).toHaveBeenCalledTimes(1)
    expect(harness.publish).not.toHaveBeenCalled()
    expect(harness.navigate).toHaveBeenCalledTimes(1)
  })

  it("uses the new revision if the author changes text after an image failure", async () => {
    await render(true)
    await fill("title", "First edit")
    await chooseImage()
    await submit()
    await fill("title", "Second edit")
    await submit()
    expect(
      harness.update.mock.calls.map(([args]) => [
        args.title,
        args.expectedRevision,
      ])
    ).toEqual([
      ["First edit", 7],
      ["Second edit", 8],
    ])
    expect(harness.navigate).toHaveBeenCalledTimes(1)
  })

  it.each([9, 10])(
    "reconciles only the expected own artwork revision and rejects concurrent edits (revision %i)",
    async (serverRevision) => {
      harness.upload
        .mockReset()
        .mockImplementationOnce(
          (file, contributionId, _generate, _save, attempt) => {
            Object.assign(attempt, {
              file,
              contributionId,
              intentId: "intent",
              storageId: "storage",
            })
            return Promise.reject(new Error("save response lost"))
          }
        )
        .mockResolvedValue(undefined)
      harness.queryRevision = serverRevision
      await render(true)
      await fill("title", "First edit")
      await chooseImage()
      await submit()
      await fill("title", "Second edit")
      await submit()
      expect(harness.upload).toHaveBeenCalledTimes(2)
      if (serverRevision === 9) {
        expect(
          harness.update.mock.calls.map(([args]) => args.expectedRevision)
        ).toEqual([7, 9])
        expect(harness.navigate).toHaveBeenCalledTimes(1)
      } else {
        expect(harness.update).toHaveBeenCalledTimes(1)
        expect(harness.navigate).not.toHaveBeenCalled()
        expect(container.textContent).toContain("Le contenu a changé")
      }
    }
  )

  it("recovers a committed publication after a lost response even if the form changed before retry", async () => {
    harness.publish
      .mockRejectedValueOnce(new Error("lost response"))
      .mockResolvedValueOnce("created")
    await render()
    await fill("title", "Original title")
    await fill("primaryArtist", "Artist")
    await fill("lyricsText", "Lyrics")
    await submit()
    expect(harness.navigate).not.toHaveBeenCalled()
    await fill("title", "Changed after timeout")
    await submit()
    expect(harness.publish).toHaveBeenCalledTimes(2)
    expect(harness.publish.mock.calls[0]![0].requestId).toBe(
      harness.publish.mock.calls[1]![0].requestId
    )
    expect(harness.update).toHaveBeenCalledWith(
      expect.objectContaining({
        contributionId: "created",
        expectedRevision: 1,
        title: "Changed after timeout",
      })
    )
    expect(harness.navigate).toHaveBeenCalledTimes(1)
  })

  it("rejects whitespace-only lyrics before publishing", async () => {
    await render()
    await fill("title", "Title")
    await fill("primaryArtist", "Artist")
    await fill("lyricsText", " \n ")
    await submit()
    expect(harness.publish).not.toHaveBeenCalled()
    expect(container.textContent).toContain(
      "Le texte des paroles est obligatoire"
    )
  })
})
