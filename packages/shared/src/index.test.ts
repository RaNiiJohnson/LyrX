import { describe, expect, it } from "vitest"

import {
  DEFAULT_LOCALE,
  PRODUCT_ID,
  PRODUCT_NAME,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "./index"

describe("portable product identity", () => {
  it("exposes the stable technical and public names", () => {
    expect(PRODUCT_ID).toBe("lyrx")
    expect(PRODUCT_NAME).toBe("Lyr'X")
  })

  it("keeps French first while making the supported locale union reusable", () => {
    const locale: SupportedLocale = DEFAULT_LOCALE

    expect(locale).toBe("fr")
    expect(SUPPORTED_LOCALES).toEqual(["fr", "en"])
    expect(Object.isFrozen(SUPPORTED_LOCALES)).toBe(true)
  })
})
