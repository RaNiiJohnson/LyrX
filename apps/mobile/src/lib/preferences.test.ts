import { describe, expect, it } from "vitest"
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  resolveLocale,
} from "@/lib/preferences"

describe("parsePreferences", () => {
  it("falls back to the defaults when nothing is stored", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences("")).toEqual(DEFAULT_PREFERENCES)
  })

  it("restores valid choices", () => {
    expect(
      parsePreferences(JSON.stringify({ theme: "dark", language: "en" }))
    ).toEqual({ theme: "dark", language: "en" })
    expect(
      parsePreferences(JSON.stringify({ theme: "light", language: "system" }))
    ).toEqual({ theme: "light", language: "system" })
  })

  it("ignores corrupt or unknown values field by field", () => {
    expect(parsePreferences("{not json")).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences("42")).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences("null")).toEqual(DEFAULT_PREFERENCES)
    expect(
      parsePreferences(JSON.stringify({ theme: "sepia", language: "en" }))
    ).toEqual({ theme: "system", language: "en" })
    expect(
      parsePreferences(JSON.stringify({ theme: "dark", language: "de" }))
    ).toEqual({ theme: "dark", language: "system" })
  })
})

describe("resolveLocale", () => {
  it("keeps an explicit choice whatever the device says", () => {
    expect(resolveLocale("en", "fr-FR")).toBe("en")
    expect(resolveLocale("fr", "en-US")).toBe("fr")
  })

  it("follows a supported device language", () => {
    expect(resolveLocale("system", "en-GB")).toBe("en")
    expect(resolveLocale("system", "FR")).toBe("fr")
  })

  it("uses the default language for an unsupported device language", () => {
    expect(resolveLocale("system", "de-DE")).toBe("fr")
    expect(resolveLocale("system", "")).toBe("fr")
  })
})
