import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"

export const GENRES = [
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
export type Genre = (typeof GENRES)[number]

/** Fields the mobile form edits; credits, links and artwork are left as saved. */
export type ContributionValues = {
  title: string
  primaryArtist: string
  albumTitle: string
  lyricsText: string
  context: string
  releaseDate: string
  genre: "" | Genre
  otherGenre: string
}

export const EMPTY_CONTRIBUTION: ContributionValues = {
  title: "",
  primaryArtist: "",
  albumTitle: "",
  lyricsText: "",
  context: "",
  releaseDate: "",
  genre: "",
  otherGenre: "",
}

type Saved = Partial<{
  title: string
  primaryArtist: string
  albumTitle: string
  lyricsText: string
  context: string
  releaseDate: number
  genre: Genre
  otherGenre: string
}>

export function dateInputFromTimestamp(timestamp?: number) {
  return timestamp ? new Date(timestamp).toISOString().slice(0, 10) : ""
}

/** `YYYY-MM-DD` (UTC midnight, like the web) or undefined when empty or not a real date. */
export function timestampFromDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return undefined
  const timestamp = Date.parse(`${value.trim()}T00:00:00.000Z`)
  return Number.isNaN(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value.trim()
    ? undefined
    : timestamp
}

export function valuesFromSaved(saved: Saved): ContributionValues {
  return {
    title: saved.title ?? "",
    primaryArtist: saved.primaryArtist ?? "",
    albumTitle: saved.albumTitle ?? "",
    lyricsText: saved.lyricsText ?? "",
    context: saved.context ?? "",
    releaseDate: dateInputFromTimestamp(saved.releaseDate),
    genre: saved.genre ?? "",
    otherGenre: saved.otherGenre ?? "",
  }
}

export type ContributionErrors = Partial<
  Record<
    "title" | "primaryArtist" | "lyricsText" | "releaseDate" | "otherGenre",
    "required" | "invalid"
  >
>

export function contributionErrors(
  values: ContributionValues
): ContributionErrors {
  const errors: ContributionErrors = {}
  const title = values.title.trim()
  if (!title || title.length > 160) errors.title = "required"
  const artist = values.primaryArtist.trim()
  if (!artist || artist.length > 120) errors.primaryArtist = "required"
  if (
    !values.lyricsText.trim() ||
    values.lyricsText.length > MAX_LYRICS_TEXT_LENGTH
  )
    errors.lyricsText = "required"
  if (values.releaseDate.trim() && !timestampFromDateInput(values.releaseDate))
    errors.releaseDate = "invalid"
  if (values.genre === "other" && !values.otherGenre.trim())
    errors.otherGenre = "required"
  return errors
}

/**
 * Mutation arguments. Optional text is sent as "" so the member can clear it; omitted fields
 * (credits, links) keep their saved value on the server. `clear*` flags remove genre/date.
 */
export function contributionInput(values: ContributionValues) {
  return {
    title: values.title.trim(),
    primaryArtist: values.primaryArtist.trim(),
    lyricsText: values.lyricsText,
    albumTitle: values.albumTitle.trim(),
    context: values.context.trim(),
    releaseDate: timestampFromDateInput(values.releaseDate),
    genre: values.genre || undefined,
    otherGenre: values.genre === "other" ? values.otherGenre.trim() : "",
  }
}

export function clearFlags(values: ContributionValues) {
  return {
    clearGenre: !values.genre,
    clearReleaseDate: !timestampFromDateInput(values.releaseDate),
  }
}
