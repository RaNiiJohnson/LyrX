import { describe, expect, it } from "vitest"

import {
  collectSongCredits,
  collectSongInformation,
  collectPlayableListeningLinks,
  getListeningEmbed,
} from "./song-display"

const completeSong = {
  releaseDate: Date.UTC(2026, 9, 23),
  genre: "other" as const,
  otherGenre: "Salegy moderne",
  guestArtists: ["Aina", "Fara"],
  writers: ["Rija"],
  composers: ["Mamy"],
  producers: ["Tovo"],
  label: "Lyr'X Records",
}

describe("song preview display", () => {
  it("exposes every saved information and credit field to the preview", () => {
    expect(collectSongInformation(completeSong).map((item) => item.id)).toEqual(
      ["releaseDate", "genre"]
    )
    expect(collectSongCredits(completeSong).map((item) => item.id)).toEqual([
      "guestArtists",
      "writers",
      "composers",
      "producers",
      "label",
    ])
    expect(
      collectSongInformation(completeSong).find(({ id }) => id === "genre")
        ?.value
    ).toBe("Salegy moderne")
  })

  it("builds official on-demand YouTube and Spotify embeds", () => {
    expect(
      getListeningEmbed({
        provider: "youtube",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      })
    ).toEqual({
      kind: "youtube",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    })
    expect(
      getListeningEmbed({
        provider: "spotify",
        url: "https://open.spotify.com/track/1234567890",
      })
    ).toEqual({
      kind: "spotify",
      url: "https://open.spotify.com/embed/track/1234567890",
    })
  })

  it("never embeds unsupported or malformed links", () => {
    expect(
      getListeningEmbed({
        provider: "apple-music",
        url: "https://music.apple.com/fr/album/example/1",
      })
    ).toBeNull()
    expect(
      getListeningEmbed({
        provider: "youtube",
        url: "https://example.com/watch?v=dQw4w9WgXcQ",
      })
    ).toBeNull()
  })

  it("keeps source links separate from the only providers that can render a player", () => {
    expect(
      collectPlayableListeningLinks([
        {
          provider: "youtube",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
        {
          provider: "apple-music",
          url: "https://music.apple.com/fr/album/example/1",
        },
      ])
    ).toMatchObject([
      {
        provider: "youtube",
        embed: { kind: "youtube" },
      },
    ])
  })

  it("creates at most one player tab per provider", () => {
    expect(
      collectPlayableListeningLinks([
        {
          provider: "youtube",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
        {
          provider: "youtube",
          url: "https://youtu.be/abcdefghijk",
        },
      ])
    ).toHaveLength(1)
  })
})
