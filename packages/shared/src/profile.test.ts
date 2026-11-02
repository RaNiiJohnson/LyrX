import { describe, expect, it } from "vitest"

import { isValidDisplayName, isValidHandle, suggestHandle } from "./profile"

describe("profile input rules", () => {
  it.each(["rija", "rija.music", "fan_2026", "artist-name", "UPPERCASE"])(
    "accepts the handle %s",
    (handle) => expect(isValidHandle(handle)).toBe(true)
  )

  it.each(["ab", ".artist", "artist-", "with space"])(
    "rejects the handle %s",
    (handle) => expect(isValidHandle(handle)).toBe(false)
  )

  it("validates the trimmed display-name length", () => {
    expect(isValidDisplayName(" Miora ")).toBe(true)
    expect(isValidDisplayName(" x ")).toBe(false)
    expect(isValidDisplayName("x".repeat(81))).toBe(false)
  })

  it.each([
    ["Rija Rasolo", "rija.rasolo"],
    ["  Mïora   & Co ", "miora.co"],
    ["Élodie_R.", "elodie_r"],
    ["Ny Aina 2026", "ny.aina.2026"],
    ["!!", ""],
    ["Ab", ""],
  ])("suggests a valid handle from %s", (name, expected) => {
    const handle = suggestHandle(name)
    expect(handle).toBe(expected)
    if (handle) expect(isValidHandle(handle)).toBe(true)
  })
})
