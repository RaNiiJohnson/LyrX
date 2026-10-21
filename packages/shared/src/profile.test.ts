import { describe, expect, it } from "vitest"

import { isValidDisplayName, isValidHandle } from "./profile"

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
})
