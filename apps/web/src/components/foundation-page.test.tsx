import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PRODUCT_NAME } from "@lyrx/shared"

import { FoundationPage } from "./foundation-page"

describe("foundation page", () => {
  it("renders the French foundation status without claiming a product feature", () => {
    const html = renderToStaticMarkup(<FoundationPage />)

    expect(html).toContain(PRODUCT_NAME.replace("'", "&#x27;"))
    expect(html).toContain("La fondation web est prête")
    expect(html).toContain("leurs lots dédiés")
  })
})
