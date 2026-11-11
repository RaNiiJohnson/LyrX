import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"
import {
  dateInputFromTimestamp,
  timestampFromDateInput,
  type Genre,
} from "@/lib/contribution-form"

export const LISTENING_PROVIDERS = [
  "spotify",
  "apple-music",
  "youtube",
  "deezer",
  "soundcloud",
  "mediafire",
  "other",
] as const
export type ListeningProvider = (typeof LISTENING_PROVIDERS)[number]
export type ListeningLink = { provider: ListeningProvider; url: string }

export const MAX_LISTENING_LINKS = 12
const LIST_LIMITS = {
  guestArtists: 20,
  writers: 30,
  composers: 30,
  producers: 30,
  additionalCredits: 50,
  credits: 50,
} as const

/** One name per line, blank lines dropped (the web's textarea convention). */
export function splitLines(value: string): Array<string> {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
}

const joinLines = (values: ReadonlyArray<string> | undefined) =>
  (values ?? []).join("\n")

const optional = (value: string) => {
  const trimmed = value.trim()
  return trimmed === "" ? undefined : trimmed
}

export type SongValues = {
  title: string
  primaryArtist: string
  guestArtists: string
  releaseDate: string
  description: string
  context: string
  genre: "" | Genre
  otherGenre: string
  writers: string
  composers: string
  producers: string
  label: string
  additionalCredits: string
  listeningLinks: Array<ListeningLink>
  lyricsText: string
}

export const EMPTY_SONG: SongValues = {
  title: "",
  primaryArtist: "",
  guestArtists: "",
  releaseDate: "",
  description: "",
  context: "",
  genre: "",
  otherGenre: "",
  writers: "",
  composers: "",
  producers: "",
  label: "",
  additionalCredits: "",
  listeningLinks: [],
  lyricsText: "",
}

type SavedSong = {
  title: string
  primaryArtist: string
  guestArtists: ReadonlyArray<string>
  releaseDate?: number
  description?: string
  context?: string
  genre?: Genre
  otherGenre?: string
  writers: ReadonlyArray<string>
  composers: ReadonlyArray<string>
  producers: ReadonlyArray<string>
  label?: string
  additionalCredits?: ReadonlyArray<string>
  listeningLinks: ReadonlyArray<ListeningLink>
}

export function songValuesFromSaved(
  song: SavedSong,
  lyricsText: string
): SongValues {
  return {
    title: song.title,
    primaryArtist: song.primaryArtist,
    guestArtists: joinLines(song.guestArtists),
    releaseDate: dateInputFromTimestamp(song.releaseDate),
    description: song.description ?? "",
    context: song.context ?? "",
    genre: song.genre ?? "",
    otherGenre: song.otherGenre ?? "",
    writers: joinLines(song.writers),
    composers: joinLines(song.composers),
    producers: joinLines(song.producers),
    label: song.label ?? "",
    additionalCredits: joinLines(song.additionalCredits),
    listeningLinks: song.listeningLinks.map((link) => ({ ...link })),
    lyricsText,
  }
}

export type SongField =
  | "title"
  | "primaryArtist"
  | "lyricsText"
  | "releaseDate"
  | "otherGenre"
  | "listeningLinks"
  | "lists"

/** Cheap client-side mirror of the server rules; the server stays the authority. */
export function songErrors(
  values: SongValues
): Partial<Record<SongField, true>> {
  const errors: Partial<Record<SongField, true>> = {}
  const title = values.title.trim()
  if (!title || title.length > 160) errors.title = true
  const artist = values.primaryArtist.trim()
  if (!artist || artist.length > 120) errors.primaryArtist = true
  if (
    !values.lyricsText.trim() ||
    values.lyricsText.length > MAX_LYRICS_TEXT_LENGTH
  )
    errors.lyricsText = true
  if (values.releaseDate.trim() && !timestampFromDateInput(values.releaseDate))
    errors.releaseDate = true
  if (values.genre === "other" && !values.otherGenre.trim())
    errors.otherGenre = true
  if (
    values.listeningLinks.length > MAX_LISTENING_LINKS ||
    values.listeningLinks.some(
      (link) => !/^https:\/\/\S+$/i.test(link.url.trim())
    )
  )
    errors.listeningLinks = true
  const lists: Array<[string, number]> = [
    [values.guestArtists, LIST_LIMITS.guestArtists],
    [values.writers, LIST_LIMITS.writers],
    [values.composers, LIST_LIMITS.composers],
    [values.producers, LIST_LIMITS.producers],
    [values.additionalCredits, LIST_LIMITS.additionalCredits],
  ]
  if (
    lists.some(([value, max]) => {
      const lines = splitLines(value)
      return lines.length > max || lines.some((line) => line.length > 100)
    })
  )
    errors.lists = true
  return errors
}

/** Whole-song payload: `updateSong` replaces the document, so empty means cleared. */
export function songInput(values: SongValues) {
  const additional = splitLines(values.additionalCredits)
  return {
    title: values.title.trim(),
    primaryArtist: values.primaryArtist.trim(),
    guestArtists: splitLines(values.guestArtists),
    releaseDate: timestampFromDateInput(values.releaseDate),
    description: optional(values.description),
    context: optional(values.context),
    genre: values.genre || undefined,
    otherGenre: values.genre === "other" ? values.otherGenre.trim() : undefined,
    writers: splitLines(values.writers),
    composers: splitLines(values.composers),
    producers: splitLines(values.producers),
    label: optional(values.label),
    additionalCredits: additional.length ? additional : undefined,
    listeningLinks: values.listeningLinks.map((link) => ({
      provider: link.provider,
      url: link.url.trim(),
    })),
    lyricsText: values.lyricsText,
  }
}

export type AlbumValues = {
  title: string
  releaseDate: string
  description: string
  genre: "" | Genre
  otherGenre: string
  label: string
  credits: string
}

export const EMPTY_ALBUM: AlbumValues = {
  title: "",
  releaseDate: "",
  description: "",
  genre: "",
  otherGenre: "",
  label: "",
  credits: "",
}

type SavedAlbum = {
  title: string
  releaseDate?: number
  description?: string
  genre?: Genre
  otherGenre?: string
  label?: string
  credits: ReadonlyArray<string>
}

export function albumValuesFromSaved(album: SavedAlbum): AlbumValues {
  return {
    title: album.title,
    releaseDate: dateInputFromTimestamp(album.releaseDate),
    description: album.description ?? "",
    genre: album.genre ?? "",
    otherGenre: album.otherGenre ?? "",
    label: album.label ?? "",
    credits: joinLines(album.credits),
  }
}

export type AlbumField = "title" | "releaseDate" | "otherGenre" | "credits"

export function albumErrors(
  values: AlbumValues
): Partial<Record<AlbumField, true>> {
  const errors: Partial<Record<AlbumField, true>> = {}
  const title = values.title.trim()
  if (!title || title.length > 160) errors.title = true
  if (values.releaseDate.trim() && !timestampFromDateInput(values.releaseDate))
    errors.releaseDate = true
  if (values.genre === "other" && !values.otherGenre.trim())
    errors.otherGenre = true
  const credits = splitLines(values.credits)
  if (
    credits.length > LIST_LIMITS.credits ||
    credits.some((line) => line.length > 100)
  )
    errors.credits = true
  return errors
}

export function albumInput(values: AlbumValues) {
  return {
    title: values.title.trim(),
    releaseDate: timestampFromDateInput(values.releaseDate),
    description: optional(values.description),
    genre: values.genre || undefined,
    otherGenre: values.genre === "other" ? values.otherGenre.trim() : undefined,
    label: optional(values.label),
    credits: splitLines(values.credits),
  }
}

/** Moves `index` by `delta` positions; returns the same array when the move is out of range. */
export function moveItem<TItem>(
  items: ReadonlyArray<TItem>,
  index: number,
  delta: -1 | 1
): Array<TItem> {
  const target = index + delta
  const next = [...items]
  if (
    index < 0 ||
    index >= items.length ||
    target < 0 ||
    target >= items.length
  )
    return next
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved as TItem)
  return next
}
