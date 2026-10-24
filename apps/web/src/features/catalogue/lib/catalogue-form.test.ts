import { describe, expect, it } from "vitest"

import {
  emptySongValues,
  namesFromTextarea,
  toSongMutationInput,
} from "./catalogue-form"

describe("catalogue form mapping", () => {
  it("normalizes multiline credits", () => {
    expect(namesFromTextarea(" Alice \n\nBob\n Alice ")).toEqual([
      "Alice",
      "Bob",
      "Alice",
    ])
  })

  it("preserves the canonical lyric text without trimming or normalization", () => {
    const values = emptySongValues("Lyr’X")
    values.lyricsText = "[Couplet 1]\r\nUne ligne\r\n\r\n"

    expect(toSongMutationInput(values).lyricsText).toBe(values.lyricsText)
  })

  it("omits the transitional primary language when it is empty", () => {
    const values = emptySongValues("Lyr’X")

    expect(toSongMutationInput(values).primaryLanguage).toBeUndefined()
  })
})
