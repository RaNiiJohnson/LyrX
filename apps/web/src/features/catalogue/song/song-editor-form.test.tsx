// @vitest-environment happy-dom
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "@/app/locale-provider"
import { SongEditorForm } from "./song-editor-form"

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), navigate: vi.fn() }))
vi.mock("convex/react", () => ({ useMutation: () => mocks.mutate }))
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  Link: ({
    to,
    params: _params,
    search: _search,
    ...props
  }: ComponentProps<"a"> & {
    to: string
    params?: unknown
    search?: unknown
  }) => <a href={to} {...props} />,
}))

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  mocks.mutate.mockReset()
  mocks.navigate.mockReset()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe("song editor layout and canonical form", () => {
  it("shows the referenced layout without the rejected essentials introduction", async () => {
    await act(async () => {
      root.render(
        <LocaleProvider>
          <SongEditorForm albums={[]} primaryArtist="An artist" />
        </LocaleProvider>
      )
      await Promise.resolve()
    })
    expect(host.textContent).not.toContain("L’essentiel du morceau")
    expect(host.textContent).not.toContain("Commencez par l’identité")
    expect(host.querySelectorAll("form")).toHaveLength(1)
    expect(host.querySelectorAll("textarea[name=lyricsText]")).toHaveLength(1)
    expect(
      host.querySelector<HTMLTextAreaElement>("textarea[name=lyricsText]")
        ?.required
    ).toBe(true)
    expect(
      host.querySelector<HTMLInputElement>("input[name=title]")?.required
    ).toBe(true)
    expect(
      host.querySelector<HTMLInputElement>("input[name=primaryArtist]")?.value
    ).toBe("An artist")
    expect(
      host.querySelector(
        '[role="radiogroup"][aria-labelledby="release-type-label"]'
      )
    ).not.toBeNull()
    const album = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
      (e) => e.textContent.trim() === "Morceau d’un album"
    )
    expect(album).toBeDefined()
    await act(async () => {
      album?.click()
      await Promise.resolve()
    })
    expect(host.querySelector('[role="combobox"][id="albumId"]')).not.toBeNull()
    const single = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
      (e) => e.textContent.trim() === "Single"
    )
    await act(async () => {
      single?.click()
      await Promise.resolve()
    })
    expect(host.querySelector('[id="albumId"]')).toBeNull()
    expect(host.textContent).toContain("Informations complémentaires")
    expect(
      host.querySelector('input[type="file"]')?.getAttribute("accept")
    ).toBe("image/jpeg,image/png,image/webp")
    expect(mocks.mutate).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
