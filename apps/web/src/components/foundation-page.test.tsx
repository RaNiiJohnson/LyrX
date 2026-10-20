import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { MissingBackendNotice } from "./foundation-page"
import { LocaleProvider } from "./locale-provider"

describe("account foundation page", () => {
  it("renders the backend configuration limitation without faking integrations", () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <MissingBackendNotice />
      </LocaleProvider>
    )

    expect(html).toContain("Aucune intégration simulée")
    expect(html).toContain("Aucun déploiement")
  })
})
