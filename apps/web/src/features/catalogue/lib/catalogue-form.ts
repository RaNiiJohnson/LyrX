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
    listeningLinks: value.listeningLinks.filter((link) => link.url.trim()),
    lyricsText: value.lyricsText,
  }
}

export function emptySongValues(primaryArtist = ""): SongFormValues {
  return {
    title: "",
    primaryArtist,
    guestArtists: "",
    releaseDate: "",
    description: "",
    context: "",
    primaryLanguage: "fr",
    genre: "",
    otherGenre: "",
    writers: "",
    composers: "",
    producers: "",
    label: "",
    listeningLinks: [],
    lyricsText: "",
  }
}
