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

describe("artwork policy", () => {
  it("caps the longest side at 1600 px and accepts up to 10 MB", () => {
    expect(resizeFor("artwork", { width: 3200, height: 3200 })).toEqual({
      width: 1600,
    })
    expect(resizeFor("artwork", { width: 1200, height: 1200 })).toBeNull()
    expect(acceptableInput("artwork", 10 * 1024 * 1024)).toBe(true)
    expect(acceptableInput("artwork", 10 * 1024 * 1024 + 1)).toBe(false)
  })
})
