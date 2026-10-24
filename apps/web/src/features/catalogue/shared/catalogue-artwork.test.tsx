import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

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
  })
})
