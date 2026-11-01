import { describe, expect, it } from "vitest"
import { validShareRange } from "./sharing"

describe("sharing text selection", () => {
  it("accepts exact Unicode/CRLF ranges and rejects oversized or broken selections", () => {
    expect(validShareRange("😀\r\nTeny", 0, 2)).toBe(true)
    expect(validShareRange("😀\r\nTeny", 0, 1)).toBe(false)
    expect(validShareRange("😀\r\nTeny", 2, 4)).toBe(false)
    expect(validShareRange("x".repeat(361), 0, 361)).toBe(false)
    expect(validShareRange("x".repeat(360), 0, 360)).toBe(true)
    expect(validShareRange("text", NaN, 3)).toBe(false)
  })
})
