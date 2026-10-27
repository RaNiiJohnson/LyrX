import { describe, expect, it } from "vitest"
import { genreSearchText, matchingExcerpt } from "./searchText"

describe("literal search excerpts", () => {
  it("keeps source text, bounds context and matches final prefixes only", () => {
    expect(matchingExcerpt("Tiako ny tanindrazako", "tanind")).toBe(
      "Tiako ny tanindrazako"
    )
    expect(matchingExcerpt("Tiako ny tanindrazako", "indraz")).toBeNull()
    expect(matchingExcerpt("Tiako ny tanindrazako", "tanind absent")).toBeNull()
    expect(matchingExcerpt("Miaina eto an-tanàna", "miaina")).toContain(
      "Miaina"
    )
    const excerpt = matchingExcerpt(
      `${"x ".repeat(200)}Tiako ${"z ".repeat(200)}`,
      "Tiako"
    )!
    expect(excerpt.length).toBeLessThanOrEqual(222)
    expect(excerpt.startsWith("…")).toBe(true)
    expect(excerpt.endsWith("…")).toBe(true)
    expect(excerpt).toContain("Tiako")
  })
  it("provides public genre vocabulary in both interface languages", () => {
    expect(genreSearchText("electronic")).toContain("électronique")
    expect(genreSearchText("other", "Salegy")).toBe("other other autre Salegy")
  })
})
