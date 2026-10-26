import type { Doc } from "@lyrx/backend/convex/_generated/dataModel"
import { describe, expect, it } from "vitest"
import {
  communityValuesFromDetail,
  toCommunityMutationInput,
} from "./community-editor-values"

describe("community metadata form values", () => {
  it("offers optional blank defaults without catalogue ownership or album association", () => {
    const values = communityValuesFromDetail()
    expect(values).toMatchObject({
      albumTitle: "",
      releaseDate: "",
      description: "",
      context: "",
      genre: "",
      otherGenre: "",
      label: "",
      guestArtists: "",
      writers: "",
      composers: "",
      producers: "",
      additionalCredits: "",
      listeningLinks: [],
    })
    const input = toCommunityMutationInput(values)
    expect(input).not.toHaveProperty("albumContext")
    expect(input).not.toHaveProperty("authorMemberId")
    expect(input).not.toHaveProperty("primaryLanguage")
  })

  it("supports legacy contributions without newly added arrays", () => {
    const legacy = {
      title: "Legacy",
      primaryArtist: "Artist",
      lyricsText: "  original\r\ntext\n",
    } as Doc<"communityContributions">
    const values = communityValuesFromDetail(legacy)
    expect(values.guestArtists).toBe("")
    expect(values.listeningLinks).toEqual([])
    expect(toCommunityMutationInput(values).lyricsText).toBe(legacy.lyricsText)
  })

  it("converts credits, date and links while retaining raw lyrics", () => {
    const input = toCommunityMutationInput({
      ...communityValuesFromDetail(),
      title: "Song",
      primaryArtist: "Artist",
      lyricsText: "  verse\r\n\n",
      albumTitle: "Reference only",
      releaseDate: "2026-10-25",
      genre: "other",
      otherGenre: "Salegy",
      writers: " One\n\n Two ",
      guestArtists: "Guest",
      additionalCredits: "Cover artist",
      listeningLinks: [
        { provider: "youtube", url: "https://youtube.com/watch?v=test" },
        { provider: "spotify", url: " " },
      ],
    })
    expect(input).toMatchObject({
      albumTitle: "Reference only",
      releaseDate: Date.UTC(2026, 9, 25),
      genre: "other",
      otherGenre: "Salegy",
      writers: ["One", "Two"],
      guestArtists: ["Guest"],
      additionalCredits: ["Cover artist"],
      lyricsText: "  verse\r\n\n",
    })
    expect(input.listeningLinks).toHaveLength(1)
  })

  it("sends explicit empty strings and arrays so users can clear optional metadata", () => {
    const input = toCommunityMutationInput(communityValuesFromDetail())
    expect(input).toMatchObject({
      albumTitle: "",
      description: "",
      context: "",
      label: "",
      otherGenre: "",
      writers: [],
      composers: [],
      producers: [],
      guestArtists: [],
      additionalCredits: [],
      listeningLinks: [],
    })
  })
})
