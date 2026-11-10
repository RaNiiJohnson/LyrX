import { describe, expect, it } from "vitest"
import { lyricsPreview } from "./lyricsPreview"

describe("lyricsPreview", () => {
  it("skips headings and blank lines and keeps three lines", () => {
    expect(
      lyricsPreview("[Verse 1]\r\n\r\nOne\nTwo\n[Chorus]\nThree\nFour")
    ).toBe("One\nTwo\nThree")
  })
  it("shortens long lines without splitting characters", () => {
    const preview = lyricsPreview(`${"😀".repeat(200)}`)!
    expect(Array.from(preview)).toHaveLength(90)
    expect(preview.endsWith("…")).toBe(true)
  })
  it("returns nothing when there is no lyric line", () => {
    expect(lyricsPreview(undefined)).toBeUndefined()
    expect(lyricsPreview("[Intro]\n  \n")).toBeUndefined()
  })
})
