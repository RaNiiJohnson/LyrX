import { describe, expect, it } from "vitest"
import {
  EMPTY_ALBUM,
  EMPTY_SONG,
  albumErrors,
  albumInput,
  moveItem,
  songErrors,
  songInput,
  songValuesFromSaved,
  splitLines,
} from "./studio-form"

const valid = {
  ...EMPTY_SONG,
  title: " Titre ",
  primaryArtist: "Artiste",
  lyricsText: "Une ligne",
}

describe("studio song form", () => {
  it("splits one name per line and drops blanks", () => {
    expect(splitLines(" A \n\n B\n  ")).toEqual(["A", "B"])
  })

  it("requires title, artist and lyrics", () => {
    expect(Object.keys(songErrors(EMPTY_SONG)).sort()).toEqual([
      "lyricsText",
      "primaryArtist",
      "title",
    ])
    expect(songErrors(valid)).toEqual({})
  })

  it("rejects a bad date, a missing custom genre and non-HTTPS links", () => {
    const errors = songErrors({
      ...valid,
      releaseDate: "2024-02-31",
      genre: "other",
      listeningLinks: [{ provider: "spotify", url: "http://x.test" }],
    })
    expect(errors).toMatchObject({
      releaseDate: true,
      otherGenre: true,
      listeningLinks: true,
    })
  })

  it("builds a whole-song payload with cleared optionals omitted", () => {
    const input = songInput({
      ...valid,
      guestArtists: "A\nB",
      releaseDate: "2024-03-05",
      genre: "pop",
      otherGenre: "ignored",
    })
    expect(input).toMatchObject({
      title: "Titre",
      guestArtists: ["A", "B"],
      releaseDate: Date.parse("2024-03-05T00:00:00.000Z"),
      genre: "pop",
      otherGenre: undefined,
      description: undefined,
      additionalCredits: undefined,
    })
  })

  it("round-trips a saved song", () => {
    const values = songValuesFromSaved(
      {
        title: "T",
        primaryArtist: "A",
        guestArtists: ["G"],
        writers: [],
        composers: [],
        producers: [],
        additionalCredits: ["X", "Y"],
        listeningLinks: [{ provider: "youtube", url: "https://y.test/1" }],
        genre: "other",
        otherGenre: "Zouk",
      },
      "L"
    )
    expect(values.additionalCredits).toBe("X\nY")
    expect(songInput(values)).toMatchObject({
      guestArtists: ["G"],
      genre: "other",
      otherGenre: "Zouk",
      lyricsText: "L",
    })
  })
})

describe("studio album form and ordering", () => {
  it("validates and builds an album payload", () => {
    expect(albumErrors(EMPTY_ALBUM)).toEqual({ title: true })
    expect(
      albumInput({ ...EMPTY_ALBUM, title: " Album ", credits: "A\n\nB" })
    ).toMatchObject({ title: "Album", credits: ["A", "B"], genre: undefined })
  })

  it("moves items inside bounds only", () => {
    expect(moveItem([1, 2, 3], 1, -1)).toEqual([2, 1, 3])
    expect(moveItem([1, 2, 3], 1, 1)).toEqual([1, 3, 2])
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
    expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3])
  })
})
