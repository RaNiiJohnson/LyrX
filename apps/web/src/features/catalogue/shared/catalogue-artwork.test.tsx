// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { LocaleProvider } from "@/app/locale-provider"
import { CatalogueArtwork } from "./catalogue-artwork"
import { CatalogueArtworkCard } from "./catalogue-artwork-card"

describe("catalogue artwork controls", () => {
  it("keeps the public/read-only artwork free of upload controls", () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <CatalogueArtwork
          kind="song"
          artworkUrl="https://example.test/cover.webp"
        />
      </LocaleProvider>
    )
    expect(html).toContain("<img")
    expect(html).not.toContain("<button")
    expect(html).not.toContain('type="file"')
  })

  it.each(["song", "album"] as const)(
    "adds an accessible owner pencil for %s artwork",
    (kind) => {
      const html = renderToStaticMarkup(
        <LocaleProvider>
          <CatalogueArtwork
            kind={kind}
            artworkUrl="https://example.test/cover.webp"
            action={{ pending: false, onSelect: () => {} }}
          />
        </LocaleProvider>
      )
      expect(html).toContain('aria-label="Modifier la pochette"')
      expect(html).toContain('type="file"')
      expect(html).toContain('accept="image/jpeg,image/png,image/webp"')
      expect(html).toContain("lucide-pencil")
    }
  )

  it("offers an add action on an empty cover and disables it during upload", () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <CatalogueArtwork
          kind="album"
          artworkUrl={null}
          action={{ pending: true, onSelect: () => {} }}
        />
      </LocaleProvider>
    )
    expect(html).toContain('aria-label="Ajouter une pochette"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('disabled=""')
  })

  it("renders the creation picker without requiring a saved artwork or mentioning optimization", () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <CatalogueArtworkCard
          inputId="new-artwork"
          pending={false}
          onSelect={() => {}}
        />
      </LocaleProvider>
    )
    expect(html).toContain('type="file"')
    expect(html).toContain("10 Mo maximum.")
    expect(html).not.toContain("optimisée")
    expect(html).toContain("size-24")
    expect(html).toContain("sm:size-40")
    expect(html).toContain("border-dashed")
    expect(html).toContain("Parcourir")
    expect(html).toContain('hidden=""')
    expect(html).not.toContain('data-slot="card"')
    expect(html.match(/>Pochette</g)).toHaveLength(1)
    expect(html).not.toContain("aspect-square")
  })

  it("uses the accessible browse action, retains the selected file and clears only the local selection", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const container = document.createElement("div")
    document.body.append(container)
    const root = createRoot(container)
    const onSelect = vi.fn()
    const file = new File(["image"], "my-cover.webp", { type: "image/webp" })
    const render = async (pending = false, selectedFile?: File) => {
      await act(() => {
        root.render(
          <LocaleProvider>
            <CatalogueArtworkCard
              inputId="picker-artwork"
              pending={pending}
              onSelect={onSelect}
              selectedFile={selectedFile}
              stacked
            />
          </LocaleProvider>
        )
      })
    }
    try {
      await render()
      const input =
        container.querySelector<HTMLInputElement>('input[type="file"]')
      if (!input) throw new Error("Missing native image input")
      const click = vi.spyOn(input, "click")
      await act(() => container.querySelector("button")?.click())
      expect(click).toHaveBeenCalledOnce()
      expect(
        container.querySelector("button")?.getAttribute("aria-describedby")
      ).toBe("picker-artwork-description")
      const transfer = new DataTransfer()
      transfer.items.add(file)
      Object.defineProperty(input, "files", {
        configurable: true,
        value: transfer.files,
      })
      await act(() =>
        input.dispatchEvent(new Event("change", { bubbles: true }))
      )
      expect(onSelect).toHaveBeenLastCalledWith(file)
      expect(input.value).toBe("")
      await render(false, file)
      expect(container.textContent).toContain("my-cover.webp")
      const clear = Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Retirer la sélection"
      )
      await act(() => clear?.click())
      expect(onSelect).toHaveBeenLastCalledWith(undefined)
      await render(true, file)
      expect(
        Array.from(container.querySelectorAll("button")).every(
          (button) => button.disabled
        )
      ).toBe(true)
      expect(input.disabled).toBe(true)
      expect(container.textContent).toContain(
        "Préparation et envoi de la pochette"
      )
      expect(container.querySelector("button")?.className).toContain(
        "lg:flex-col"
      )
    } finally {
      act(() => root.unmount())
      container.remove()
      vi.unstubAllGlobals()
    }
  })

  it("replaces a failed editor thumbnail without hiding its chooser", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const container = document.createElement("div")
    document.body.append(container)
    const root = createRoot(container)
    const render = async (url: string) => {
      await act(() =>
        root.render(
          <LocaleProvider>
            <CatalogueArtworkCard
              inputId="editor-artwork"
              artworkUrl={url}
              pending={false}
              onSelect={() => {}}
            />
          </LocaleProvider>
        )
      )
    }
    try {
      await render("/broken.webp")
      await act(() =>
        container.querySelector("img")?.dispatchEvent(new Event("error"))
      )
      expect(container.querySelector("img")).toBeNull()
      expect(container.textContent).toContain("Changer l’image")
      await render("/replacement.webp")
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "/replacement.webp"
      )
    } finally {
      act(() => root.unmount())
      container.remove()
      vi.unstubAllGlobals()
    }
  })

  it("falls back after an image error and renders a replacement URL without losing the owner action", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const container = document.createElement("div")
    document.body.append(container)
    const root = createRoot(container)
    const render = async (artworkUrl: string) => {
      await act(async () => {
        root.render(
          <LocaleProvider>
            <CatalogueArtwork
              kind="song"
              artworkUrl={artworkUrl}
              action={{ pending: false, onSelect: () => {} }}
            />
          </LocaleProvider>
        )
        await Promise.resolve()
      })
    }
    try {
      await render("/broken.webp")
      await act(async () => {
        container.querySelector("img")?.dispatchEvent(new Event("error"))
        await Promise.resolve()
      })
      expect(container.querySelector("img")).toBeNull()
      expect(container.querySelector(".lucide-file-music")).not.toBeNull()
      expect(
        container.querySelector('button[aria-label="Modifier la pochette"]')
      ).not.toBeNull()
      await render("/replacement.webp")
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "/replacement.webp"
      )
    } finally {
      act(() => root.unmount())
      container.remove()
      vi.unstubAllGlobals()
    }
  })
})
