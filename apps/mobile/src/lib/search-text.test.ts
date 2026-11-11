import { describe, expect, it } from "vitest"
import { validSearch } from "@/lib/search-text"

describe("validSearch", () => {
  it("accepts ordinary queries", () => {
    expect(validSearch("blue moon")).toBe(true)
    expect(validSearch("a")).toBe(true)
  })

  it("rejects empty text", () => {
    expect(validSearch("")).toBe(false)
    expect(validSearch("   ")).toBe(false)
  })

  it("enforces the server bounds on length, terms and term size", () => {
    expect(validSearch("x".repeat(201))).toBe(false)
    expect(validSearch(Array.from({ length: 17 }, () => "a").join(" "))).toBe(
      false
    )
    expect(validSearch(Array.from({ length: 16 }, () => "a").join(" "))).toBe(
      true
    )
    expect(validSearch("y".repeat(33))).toBe(false)
    expect(validSearch("y".repeat(32))).toBe(true)
  })
})
