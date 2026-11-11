import { describe, expect, it } from "vitest"
import { acceptableInput, resizeFor } from "./image-policy"

describe("image policy", () => {
  it("shrinks only the longest side and never upscales", () => {
    expect(resizeFor("avatar", { width: 2000, height: 1000 })).toEqual({
      width: 512,
    })
    expect(resizeFor("avatar", { width: 1000, height: 2000 })).toEqual({
      height: 512,
    })
    expect(resizeFor("avatar", { width: 300, height: 512 })).toBeNull()
    expect(resizeFor("banner", { width: 3000, height: 1000 })).toEqual({
      width: 1920,
    })
  })

  it("rejects known oversize or empty files", () => {
    expect(acceptableInput("avatar", 5 * 1024 * 1024)).toBe(true)
    expect(acceptableInput("avatar", 5 * 1024 * 1024 + 1)).toBe(false)
    expect(acceptableInput("banner", 6 * 1024 * 1024)).toBe(true)
    expect(acceptableInput("avatar", 0)).toBe(false)
    expect(acceptableInput("avatar", undefined)).toBe(true)
  })
})
