import { ConvexError, type Infer, v } from "convex/values"
import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"
import type { Doc, Id } from "../_generated/dataModel"
import schema from "../schema"
import { listeningLinkValidator, songGenreValidator } from "../model"

export const MAX_TRACKS = 100

const songInputValidator = v.object({
  title: v.string(),
  primaryArtist: v.string(),
  guestArtists: v.array(v.string()),
  releaseDate: v.optional(v.number()),
  description: v.optional(v.string()),
  context: v.optional(v.string()),
  genre: v.optional(songGenreValidator),
  otherGenre: v.optional(v.string()),
  writers: v.array(v.string()),
  composers: v.array(v.string()),
  producers: v.array(v.string()),
  label: v.optional(v.string()),
  additionalCredits: v.optional(v.array(v.string())),
  listeningLinks: v.array(listeningLinkValidator),
  lyricsText: v.string(),
})

export const songInput = songInputValidator.fields

export const albumInheritanceValidator = v.object({
  inheritArtwork: v.boolean(),
  inheritGenre: v.boolean(),
  inheritLabel: v.boolean(),
  inheritCredits: v.boolean(),
})

export const albumContextValidator = v.union(
  v.object({
    albumId: v.id("albums"),
    inheritance: albumInheritanceValidator,
  }),
  v.null()
)

const albumInputValidator = v.object({
  title: v.string(),
  releaseDate: v.optional(v.number()),
  description: v.optional(v.string()),
  genre: v.optional(songGenreValidator),
  otherGenre: v.optional(v.string()),
  label: v.optional(v.string()),
  credits: v.array(v.string()),
})

export const albumInput = albumInputValidator.fields

export const songDetail = v.object({
  song: schema.doc("songs"),
  lyricsText: v.string(),
  albumTrack: v.union(schema.doc("albumTracks"), v.null()),
  album: v.union(schema.doc("albums"), v.null()),
  artworkUrl: v.union(v.string(), v.null()),
  albumArtworkUrl: v.union(v.string(), v.null()),
})

const albumTrackDetail = v.object({
  track: schema.doc("albumTracks"),
  song: schema.doc("songs"),
})

export const albumDetail = v.object({
  album: schema.doc("albums"),
  tracks: v.array(albumTrackDetail),
  trackCount: v.number(),
  artworkUrl: v.union(v.string(), v.null()),
})

export const catalogueCounts = v.object({
  songs: v.object({
    all: v.number(),
    draft: v.number(),
    published: v.number(),
  }),
  albums: v.object({
    all: v.number(),
    draft: v.number(),
    published: v.number(),
  }),
})

export const songSummary = v.object({
  _id: v.id("songs"),
  _creationTime: v.number(),
  status: v.union(v.literal("draft"), v.literal("published")),
  title: v.string(),
  primaryArtist: v.string(),
  albumId: v.union(v.id("albums"), v.null()),
  updatedAt: v.number(),
})

const publicSong = v.object({
  _id: v.id("songs"),
  _creationTime: v.number(),
  status: v.literal("published"),
  title: v.string(),
  primaryArtist: v.string(),
  guestArtists: v.array(v.string()),
  releaseDate: v.optional(v.number()),
  description: v.optional(v.string()),
  context: v.optional(v.string()),
  genre: v.optional(songGenreValidator),
  otherGenre: v.optional(v.string()),
  writers: v.array(v.string()),
  composers: v.array(v.string()),
  producers: v.array(v.string()),
  label: v.optional(v.string()),
  additionalCredits: v.optional(v.array(v.string())),
  listeningLinks: v.array(listeningLinkValidator),
  firstPublishedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

const publicAlbum = v.object({
  _id: v.id("albums"),
  _creationTime: v.number(),
  status: v.literal("published"),
  title: v.string(),
  releaseDate: v.optional(v.number()),
  description: v.optional(v.string()),
  genre: v.optional(songGenreValidator),
  otherGenre: v.optional(v.string()),
  label: v.optional(v.string()),
  credits: v.array(v.string()),
  firstPublishedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

export const publicSongDetail = v.object({
  song: publicSong,
  lyricsText: v.string(),
  album: v.union(
    v.object({
      albumId: v.id("albums"),
      title: v.string(),
      releaseDate: v.optional(v.number()),
    }),
    v.null()
  ),
  artworkUrl: v.union(v.string(), v.null()),
})

export const publicAlbumDetail = v.object({
  album: publicAlbum,
  tracks: v.array(v.object({ position: v.number(), song: publicSong })),
  artworkUrl: v.union(v.string(), v.null()),
})

export function bad(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

function text(value: string, max: number, label: string) {
  const normalized = value.trim()
  if (!normalized || normalized.length > max) {
    bad(
      "INVALID_INPUT",
      `${label} must contain between 1 and ${max} characters.`
    )
  }
  return normalized
}

function optionalText(value: string | undefined, max: number, label: string) {
  if (value === undefined) return undefined
  const normalized = value.trim()
  if (!normalized) return undefined
  if (normalized.length > max) bad("INVALID_INPUT", `${label} is too long.`)
  return normalized
}

function textList(values: Array<string>, maxItems: number, label: string) {
  if (values.length > maxItems)
    bad("INVALID_INPUT", `${label}: too many entries.`)
  return values.map((value) => text(value, 100, label))
}

function validateUrl(provider: string, value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return bad("INVALID_URL", "The listening link is invalid.")
  }
  if (url.protocol !== "https:") {
    bad("INVALID_URL", "Listening links must use HTTPS.")
  }
  const allowedHosts: Partial<Record<string, Array<string>>> = {
    spotify: ["open.spotify.com"],
    "apple-music": ["music.apple.com"],
    youtube: ["youtube.com", "youtu.be"],
    deezer: ["deezer.com"],
    soundcloud: ["soundcloud.com"],
    mediafire: ["mediafire.com"],
  }
  const hosts = allowedHosts[provider]
  if (
    hosts &&
    !hosts.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    )
  ) {
    bad("INVALID_URL", "The domain does not match the listening service.")
  }
  return url.toString()
}

function optionalDate(value: number | undefined) {
  if (value === undefined) return undefined
  if (!Number.isSafeInteger(value)) {
    bad("INVALID_INPUT", "The release date is invalid.")
  }
  return value
}

export function validatedSong(args: Infer<typeof songInputValidator>) {
  if (args.listeningLinks.length > 12)
    bad("INVALID_INPUT", "Too many listening links.")
  if (args.genre === "other" && !optionalText(args.otherGenre, 60, "Genre")) {
    bad("INVALID_INPUT", "Specify the custom genre.")
  }
  if (args.genre !== "other" && args.otherGenre !== undefined) {
    bad("INVALID_INPUT", "A custom genre requires the other option.")
  }
  return {
    title: text(args.title, 160, "Title"),
    primaryArtist: text(args.primaryArtist, 120, "Primary artist"),
    guestArtists: textList(args.guestArtists, 20, "Guest artists"),
    ...(optionalDate(args.releaseDate) === undefined
      ? {}
      : { releaseDate: optionalDate(args.releaseDate) }),
    ...(optionalText(args.description, 2_000, "Description")
      ? { description: optionalText(args.description, 2_000, "Description") }
      : {}),
    ...(optionalText(args.context, 5_000, "Context")
      ? { context: optionalText(args.context, 5_000, "Context") }
      : {}),
    ...(args.genre === undefined ? {} : { genre: args.genre }),
    ...(args.genre === "other"
      ? { otherGenre: text(args.otherGenre ?? "", 60, "Genre") }
      : {}),
    writers: textList(args.writers, 30, "Writers"),
    composers: textList(args.composers, 30, "Composers"),
    producers: textList(args.producers, 30, "Producers"),
    ...(optionalText(args.label, 120, "Label")
      ? { label: optionalText(args.label, 120, "Label") }
      : {}),
    ...(args.additionalCredits && args.additionalCredits.length > 0
      ? {
          additionalCredits: textList(
            args.additionalCredits,
            50,
            "Additional credits"
          ),
        }
      : {}),
    listeningLinks: args.listeningLinks.map((link) => ({
      provider: link.provider,
      url: validateUrl(link.provider, link.url),
    })),
    lyricsText: validateLyricsText(args.lyricsText),
  }
}

export function validatedAlbum(args: Infer<typeof albumInputValidator>) {
  if (args.genre === "other" && !optionalText(args.otherGenre, 60, "Genre")) {
    bad("INVALID_INPUT", "Specify the custom genre.")
  }
  if (args.genre !== "other" && args.otherGenre !== undefined) {
    bad("INVALID_INPUT", "A custom genre requires the other option.")
  }
  return {
    title: text(args.title, 160, "Title"),
    ...(optionalDate(args.releaseDate) === undefined
      ? {}
      : { releaseDate: optionalDate(args.releaseDate) }),
    ...(optionalText(args.description, 5_000, "Description")
      ? {
          description: optionalText(args.description, 5_000, "Description"),
        }
      : {}),
    ...(args.genre === undefined ? {} : { genre: args.genre }),
    ...(args.genre === "other"
      ? { otherGenre: text(args.otherGenre ?? "", 60, "Genre") }
      : {}),
    ...(optionalText(args.label, 120, "Label")
      ? { label: optionalText(args.label, 120, "Label") }
      : {}),
    credits: textList(args.credits, 50, "General credits"),
  }
}

export function validateLyricsText(value: string) {
  if (!value.trim()) {
    bad("INVALID_LYRICS", "Lyrics are required.")
  }
  if (value.length > MAX_LYRICS_TEXT_LENGTH) {
    bad(
      "INVALID_LYRICS",
      `Lyrics cannot exceed ${MAX_LYRICS_TEXT_LENGTH} characters.`
    )
  }
  return value
}

export function projectPublicSong(song: Doc<"songs">) {
  return {
    _id: song._id,
    _creationTime: song._creationTime,
    status: "published" as const,
    title: song.title,
    primaryArtist: song.primaryArtist,
    guestArtists: song.guestArtists,
    ...(song.releaseDate === undefined
      ? {}
      : { releaseDate: song.releaseDate }),
    ...(song.description === undefined
      ? {}
      : { description: song.description }),
    ...(song.context === undefined ? {} : { context: song.context }),
    ...(song.genre === undefined ? {} : { genre: song.genre }),
    ...(song.otherGenre === undefined ? {} : { otherGenre: song.otherGenre }),
    writers: song.writers,
    composers: song.composers,
    producers: song.producers,
    ...(song.label === undefined ? {} : { label: song.label }),
    ...(song.additionalCredits === undefined
      ? {}
      : { additionalCredits: song.additionalCredits }),
    listeningLinks: song.listeningLinks,
    ...(song.firstPublishedAt === undefined
      ? {}
      : { firstPublishedAt: song.firstPublishedAt }),
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
  }
}

export function projectPublicAlbum(album: Doc<"albums">) {
  return {
    _id: album._id,
    _creationTime: album._creationTime,
    status: "published" as const,
    title: album.title,
    ...(album.releaseDate === undefined
      ? {}
      : { releaseDate: album.releaseDate }),
    ...(album.description === undefined
      ? {}
      : { description: album.description }),
    ...(album.genre === undefined ? {} : { genre: album.genre }),
    ...(album.otherGenre === undefined ? {} : { otherGenre: album.otherGenre }),
    ...(album.label === undefined ? {} : { label: album.label }),
    credits: album.credits,
    ...(album.firstPublishedAt === undefined
      ? {}
      : { firstPublishedAt: album.firstPublishedAt }),
    createdAt: album.createdAt,
    updatedAt: album.updatedAt,
  }
}

export function projectSongSummary(
  song: Doc<"songs">,
  albumId: Id<"albums"> | null
) {
  return {
    _id: song._id,
    _creationTime: song._creationTime,
    status: song.status,
    title: song.title,
    primaryArtist: song.primaryArtist,
    albumId,
    updatedAt: song.updatedAt,
  }
}
