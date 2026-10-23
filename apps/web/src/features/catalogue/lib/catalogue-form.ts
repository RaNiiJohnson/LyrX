export const SONG_GENRES = [
  "pop",
  "rock",
  "hip-hop",
  "rnb",
  "electronic",
  "jazz",
  "folk",
  "gospel",
  "reggae",
  "other",
] as const

export const LISTENING_PROVIDERS = [
  "spotify",
  "apple-music",
  "youtube",
  "deezer",
  "soundcloud",
  "mediafire",
  "other",
] as const

export type SongGenre = (typeof SONG_GENRES)[number]
export type ListeningProvider = (typeof LISTENING_PROVIDERS)[number]

export type SongFormValues = {
  releaseType: "single" | "album"
  albumId: string
  inheritArtwork: boolean
  inheritPrimaryLanguage: boolean
  inheritGenre: boolean
  inheritLabel: boolean
  inheritCredits: boolean
  title: string
  primaryArtist: string
  guestArtists: string
  releaseDate: string
  description: string
  context: string
  primaryLanguage: string
  genre: "" | SongGenre
  otherGenre: string
  writers: string
  composers: string
  producers: string
  label: string
  additionalCredits: string
  listeningLinks: Array<{
    provider: ListeningProvider
    url: string
  }>
  lyricsText: string
}

export function namesFromTextarea(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function timestampFromDateInput(value: string) {
  if (!value) return undefined
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isNaN(timestamp) ? undefined : timestamp
}

export function dateInputFromTimestamp(timestamp?: number) {
  return timestamp ? new Date(timestamp).toISOString().slice(0, 10) : ""
}

export function toSongMutationInput(value: SongFormValues) {
  return {
    title: value.title,
    primaryArtist: value.primaryArtist,
    guestArtists: namesFromTextarea(value.guestArtists),
    releaseDate: timestampFromDateInput(value.releaseDate),
    description: value.description || undefined,
    context: value.context || undefined,
    primaryLanguage: value.primaryLanguage,
    genre: value.genre || undefined,
    otherGenre:
      value.genre === "other" ? value.otherGenre || undefined : undefined,
    writers: namesFromTextarea(value.writers),
    composers: namesFromTextarea(value.composers),
    producers: namesFromTextarea(value.producers),
    label: value.label || undefined,
    additionalCredits: namesFromTextarea(value.additionalCredits),
    listeningLinks: value.listeningLinks.filter((link) => link.url.trim()),
    lyricsText: value.lyricsText,
    albumContext:
      value.releaseType === "album" && value.albumId
        ? {
            albumId: value.albumId as Id<"albums">,
            inheritance: {
              inheritArtwork: value.inheritArtwork,
              inheritPrimaryLanguage: value.inheritPrimaryLanguage,
              inheritGenre: value.inheritGenre,
              inheritLabel: value.inheritLabel,
              inheritCredits: value.inheritCredits,
            },
          }
        : null,
  }
}

export function emptySongValues(
  primaryArtist = "",
  album?: Doc<"albums">
): SongFormValues {
  return {
    releaseType: album ? "album" : "single",
    albumId: album?._id ?? "",
    inheritArtwork: Boolean(album),
    inheritPrimaryLanguage: Boolean(album),
    inheritGenre: Boolean(album),
    inheritLabel: Boolean(album),
    inheritCredits: Boolean(album),
    title: "",
    primaryArtist,
    guestArtists: "",
    releaseDate: "",
    description: "",
    context: "",
    primaryLanguage: album?.primaryLanguage ?? "fr",
    genre: album?.genre ?? "",
    otherGenre: album?.otherGenre ?? "",
    writers: "",
    composers: "",
    producers: "",
    label: album?.label ?? "",
    additionalCredits: album?.credits.join("\n") ?? "",
    listeningLinks: [],
    lyricsText: "",
  }
}
import type { Doc, Id } from "@lyrx/backend/convex/_generated/dataModel"


export function applyAlbumDefaults(
  values: SongFormValues,
  album: Doc<"albums">
): SongFormValues {
  return {
    ...values,
    releaseType: "album",
    albumId: album._id,
    inheritArtwork: true,
    inheritPrimaryLanguage: true,
    inheritGenre: true,
    inheritLabel: true,
    inheritCredits: true,
    primaryLanguage: album.primaryLanguage ?? values.primaryLanguage,
    genre: album.genre ?? "",
    otherGenre: album.otherGenre ?? "",
    label: album.label ?? "",
    additionalCredits: album.credits.join("\n"),
  }
}
