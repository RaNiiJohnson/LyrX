import { describe, expect, it } from "vitest"
import {
  EMPTY_CONTRIBUTION,
  clearFlags,
  contributionErrors,
  contributionInput,
  timestampFromDateInput,
  valuesFromSaved,
} from "./contribution-form"

const valid = {
  ...EMPTY_CONTRIBUTION,
  title: " Titre ",
  primaryArtist: "Artiste",
  lyricsText: "Une ligne",
}

describe("contributionErrors", () => {
  it("accepts the minimal valid contribution", () => {
    expect(contributionErrors(valid)).toEqual({})
  })
  it("flags missing required fields and bad optional ones", () => {
    expect(contributionErrors(EMPTY_CONTRIBUTION)).toEqual({
      title: "required",
      primaryArtist: "required",
      lyricsText: "required",
    })
    expect(
      contributionErrors({
        ...valid,
        releaseDate: "2024-02-31",
        genre: "other",
      })
    ).toEqual({ releaseDate: "invalid", otherGenre: "required" })
  })
})

describe("dates", () => {
  it("round-trips through UTC midnight and rejects impossible dates", () => {
    const timestamp = timestampFromDateInput("2024-03-05")
    expect(timestamp).toBe(Date.UTC(2024, 2, 5))
    expect(valuesFromSaved({ releaseDate: timestamp }).releaseDate).toBe(
      "2024-03-05"
    )
    expect(timestampFromDateInput("2024-13-01")).toBeUndefined()
    expect(timestampFromDateInput("05/03/2024")).toBeUndefined()
  })
})

describe("contributionInput", () => {
  it("trims, sends empty optionals explicitly and clears genre/date when unset", () => {
    expect(contributionInput(valid)).toEqual({
      title: "Titre",
      primaryArtist: "Artiste",
      lyricsText: "Une ligne",
      albumTitle: "",
      context: "",
      releaseDate: undefined,
      genre: undefined,
      otherGenre: "",
    })
    expect(clearFlags(valid)).toEqual({
      clearGenre: true,
      clearReleaseDate: true,
    })
    const full = { ...valid, genre: "jazz" as const, releaseDate: "2024-03-05" }
    expect(clearFlags(full)).toEqual({
      clearGenre: false,
      clearReleaseDate: false,
    })
  })
})
