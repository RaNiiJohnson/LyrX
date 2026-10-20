import { describe, expect, it } from "vitest"

import { formatMessage, isSupportedLocale, UI_MESSAGES } from "./index"

describe("interface messages", () => {
  it("keeps French and English dictionaries aligned", () => {
    expect(Object.keys(UI_MESSAGES.en).sort()).toEqual(
      Object.keys(UI_MESSAGES.fr).sort()
    )
  })

  it("formats named values without changing the source dictionary", () => {
    expect(formatMessage("en", "home.readyGreeting", { name: "Miora" })).toBe(
      "Hello Miora"
    )
    expect(UI_MESSAGES.en["home.readyGreeting"]).toBe("Hello {{name}}")
  })

  it("accepts only supported locales", () => {
    expect(isSupportedLocale("fr")).toBe(true)
    expect(isSupportedLocale("en")).toBe(true)
    expect(isSupportedLocale("mg")).toBe(false)
  })
})
