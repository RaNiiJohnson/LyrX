import { ConvexError, type Infer, v } from "convex/values"
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server"
import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter"
import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"

import { components, internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import {
  internalMutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import schema from "./schema"
import {
  catalogueStatusValidator,
  listeningLinkValidator,
  songGenreValidator,
} from "./model"
import { artistMutation, artistQuery } from "./lib/functions"
import { isValidCatalogueImageMetadata } from "./lib/catalogueImages"
import {
  albumsByOwner,
  albumsByOwnerAndStatus,
  albumTracksByAlbum,
  songsByOwner,
  songsByOwnerAndStatus,
} from "./catalogueAggregates"

const MAX_SECTIONS = 40
const MAX_LINES_PER_SECTION = 100
const MAX_TRACKS = 100
const STORAGE_SWEEP_BATCH = 100
const STORAGE_SWEEP_KEY = "unclaimed-storage-v1"
const IMAGE_TTL_MS = 10 * MINUTE

const uploadLimiter = new RateLimiter(components.rateLimiter, {
  catalogueArtworkUpload: {
    kind: "fixed window",
    rate: 5,
    period: IMAGE_TTL_MS,
  },
})

const songInputValidator = v.object({
  title: v.string(),
  primaryArtist: v.string(),
  guestArtists: v.array(v.string()),
  releaseDate: v.optional(v.number()),
  description: v.optional(v.string()),
  context: v.optional(v.string()),
  primaryLanguage: v.optional(v.string()),
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
const songInput = songInputValidator.fields

const albumInheritanceValidator = v.object({
  inheritArtwork: v.boolean(),
  inheritPrimaryLanguage: v.boolean(),
  inheritGenre: v.boolean(),
  inheritLabel: v.boolean(),
  inheritCredits: v.boolean(),
})

const albumContextValidator = v.union(
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
  primaryLanguage: v.optional(v.string()),
  genre: v.optional(songGenreValidator),
  otherGenre: v.optional(v.string()),
  label: v.optional(v.string()),
  credits: v.array(v.string()),
})
const albumInput = albumInputValidator.fields

const songDetail = v.object({
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

const albumDetail = v.object({
  album: schema.doc("albums"),
  tracks: v.array(albumTrackDetail),
  trackCount: v.number(),
  artworkUrl: v.union(v.string(), v.null()),
})

const catalogueCounts = v.object({
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

const songSummary = v.object({
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
  primaryLanguage: v.optional(v.string()),
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
  primaryLanguage: v.optional(v.string()),
  genre: v.optional(songGenreValidator),
  otherGenre: v.optional(v.string()),
  label: v.optional(v.string()),
  credits: v.array(v.string()),
  firstPublishedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

const publicSongDetail = v.object({
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

const publicAlbumDetail = v.object({
  album: publicAlbum,
  tracks: v.array(v.object({ position: v.number(), song: publicSong })),
  artworkUrl: v.union(v.string(), v.null()),
})

function bad(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

function text(value: string, max: number, label: string) {
  const normalized = value.trim()
  if (!normalized || normalized.length > max) {
    bad("INVALID_INPUT", `${label} doit contenir entre 1 et ${max} caractères.`)
  }
  return normalized
}

function optionalText(value: string | undefined, max: number, label: string) {
  if (value === undefined) return undefined
  const normalized = value.trim()
  if (!normalized) return undefined
  if (normalized.length > max) bad("INVALID_INPUT", `${label} est trop long.`)
  return normalized
}

function textList(values: Array<string>, maxItems: number, label: string) {
  if (values.length > maxItems)
    bad("INVALID_INPUT", `${label}: trop d’éléments.`)
  return values.map((value) => text(value, 100, label))
}

function validateUrl(provider: string, value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return bad("INVALID_URL", "Le lien d’écoute est invalide.")
  }
  if (url.protocol !== "https:") {
    bad("INVALID_URL", "Les liens d’écoute doivent utiliser HTTPS.")
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
    bad("INVALID_URL", "Le domaine ne correspond pas au service d’écoute.")
  }
  return url.toString()
}

function optionalDate(value: number | undefined) {
  if (value === undefined) return undefined
  if (!Number.isSafeInteger(value)) {
    bad("INVALID_INPUT", "La date de sortie est invalide.")
  }
  return value
}

function validatedSong(args: Infer<typeof songInputValidator>) {
  if (args.listeningLinks.length > 12)
    bad("INVALID_INPUT", "Trop de liens d’écoute.")
  if (
    args.genre === "other" &&
    !optionalText(args.otherGenre, 60, "Le genre")
  ) {
    bad("INVALID_INPUT", "Précisez le genre personnalisé.")
  }
  if (args.genre !== "other" && args.otherGenre !== undefined) {
    bad("INVALID_INPUT", "Le genre personnalisé exige le choix « autre ».")
  }
  return {
    title: text(args.title, 160, "Le titre"),
    primaryArtist: text(args.primaryArtist, 120, "L’artiste principal"),
    guestArtists: textList(args.guestArtists, 20, "Les artistes invités"),
    ...(optionalDate(args.releaseDate) === undefined
      ? {}
      : { releaseDate: optionalDate(args.releaseDate) }),
    ...(optionalText(args.description, 2_000, "La description")
      ? { description: optionalText(args.description, 2_000, "La description") }
      : {}),
    ...(optionalText(args.context, 5_000, "Le contexte")
      ? { context: optionalText(args.context, 5_000, "Le contexte") }
      : {}),
    ...(optionalText(args.primaryLanguage, 50, "La langue")
      ? {
          primaryLanguage: optionalText(args.primaryLanguage, 50, "La langue"),
        }
      : {}),
    ...(args.genre === undefined ? {} : { genre: args.genre }),
    ...(args.genre === "other"
      ? { otherGenre: text(args.otherGenre ?? "", 60, "Le genre") }
      : {}),
    writers: textList(args.writers, 30, "Les auteurs"),
    composers: textList(args.composers, 30, "Les compositeurs"),
    producers: textList(args.producers, 30, "Les producteurs"),
    ...(optionalText(args.label, 120, "Le label")
      ? { label: optionalText(args.label, 120, "Le label") }
      : {}),
    ...(args.additionalCredits && args.additionalCredits.length > 0
      ? {
          additionalCredits: textList(
            args.additionalCredits,
            50,
            "Les crédits complémentaires"
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

function validatedAlbum(args: Infer<typeof albumInputValidator>) {
  if (
    args.genre === "other" &&
    !optionalText(args.otherGenre, 60, "Le genre")
  ) {
    bad("INVALID_INPUT", "Précisez le genre personnalisé.")
  }
  if (args.genre !== "other" && args.otherGenre !== undefined) {
    bad("INVALID_INPUT", "Le genre personnalisé exige le choix « autre ».")
  }
  return {
    title: text(args.title, 160, "Le titre"),
    ...(optionalDate(args.releaseDate) === undefined
      ? {}
      : { releaseDate: optionalDate(args.releaseDate) }),
    ...(optionalText(args.description, 5_000, "La description")
      ? {
          description: optionalText(args.description, 5_000, "La description"),
        }
      : {}),
    ...(optionalText(args.primaryLanguage, 50, "La langue")
      ? {
          primaryLanguage: optionalText(args.primaryLanguage, 50, "La langue"),
        }
      : {}),
    ...(args.genre === undefined ? {} : { genre: args.genre }),
    ...(args.genre === "other"
      ? { otherGenre: text(args.otherGenre ?? "", 60, "Le genre") }
      : {}),
    ...(optionalText(args.label, 120, "Le label")
      ? { label: optionalText(args.label, 120, "Le label") }
      : {}),
    credits: textList(args.credits, 50, "Les crédits généraux"),
  }
}

function validateLyricsText(value: string) {
  if (!value.trim()) {
    bad("INVALID_LYRICS", "Le texte des paroles est obligatoire.")
  }
  if (value.length > MAX_LYRICS_TEXT_LENGTH) {
    bad(
      "INVALID_LYRICS",
      `Les paroles ne peuvent pas dépasser ${MAX_LYRICS_TEXT_LENGTH} caractères.`
    )
  }
  return value
}

function projectPublicSong(song: Doc<"songs">) {
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
    ...(song.primaryLanguage === undefined
      ? {}
      : { primaryLanguage: song.primaryLanguage }),
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

function projectPublicAlbum(album: Doc<"albums">) {
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
    ...(album.primaryLanguage === undefined
      ? {}
      : { primaryLanguage: album.primaryLanguage }),
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

function projectSongSummary(song: Doc<"songs">, albumId: Id<"albums"> | null) {
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

async function ownedSong(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<"members">,
  songId: Id<"songs">
) {
  const song = await ctx.db.get("songs", songId)
  if (!song || song.ownerMemberId !== memberId)
    bad("NOT_FOUND", "Morceau introuvable.")
  return song
}

async function ownedAlbum(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<"members">,
  albumId: Id<"albums">
) {
  const album = await ctx.db.get("albums", albumId)
  if (!album || album.ownerMemberId !== memberId)
    bad("NOT_FOUND", "Album introuvable.")
  return album
}

async function readLyrics(ctx: QueryCtx | MutationCtx, songId: Id<"songs">) {
  const sections = await ctx.db
    .query("songSections")
    .withIndex("by_song_id_and_position", (q) => q.eq("songId", songId))
    .take(MAX_SECTIONS + 1)
  if (sections.length > MAX_SECTIONS)
    bad("CATALOGUE_INVARIANT", "Trop de sections enregistrées.")
  return Promise.all(
    sections.map(async (section: Doc<"songSections">) => {
      const lines = await ctx.db
        .query("lyricLines")
        .withIndex("by_section_id_and_position", (q) =>
          q.eq("sectionId", section._id)
        )
        .take(MAX_LINES_PER_SECTION + 1)
      if (lines.length > MAX_LINES_PER_SECTION)
        bad("CATALOGUE_INVARIANT", "Trop de lignes enregistrées.")
      return { section, lines }
    })
  )
}

const LEGACY_SECTION_HEADINGS: Record<Doc<"songSections">["kind"], string> = {
  intro: "Intro",
  verse: "Couplet",
  chorus: "Refrain",
  bridge: "Pont",
  outro: "Outro",
  custom: "Section",
}

async function legacyLyricsText(
  ctx: QueryCtx | MutationCtx,
  songId: Id<"songs">
) {
  const sections = await readLyrics(ctx, songId)
  return sections
    .map(({ section, lines }) => {
      const heading =
        section.kind === "custom"
          ? section.customLabel || LEGACY_SECTION_HEADINGS.custom
          : LEGACY_SECTION_HEADINGS[section.kind]
      return [`[${heading}]`, ...lines.map((line) => line.text)].join("\n")
    })
    .join("\n\n")
}

async function lyricsTextForSong(
  ctx: QueryCtx | MutationCtx,
  song: Doc<"songs">
) {
  return song.lyricsText ?? (await legacyLyricsText(ctx, song._id))
}

export const listMySongs = artistQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(catalogueStatusValidator),
  },
  returns: paginationResultValidator(songSummary),
  handler: async (ctx, args) => {
    const page = args.status
      ? await songsByOwnerAndStatus.paginate(ctx, {
          namespace: [ctx.member._id, args.status],
          cursor: args.paginationOpts.cursor ?? undefined,
          order: "desc",
          pageSize: args.paginationOpts.numItems,
        })
      : await songsByOwner.paginate(ctx, {
          namespace: ctx.member._id,
          cursor: args.paginationOpts.cursor ?? undefined,
          order: "desc",
          pageSize: args.paginationOpts.numItems,
        })
    const songs = await Promise.all(
      page.page.map(async ({ id }) => {
        const song = await ctx.db.get("songs", id)
        if (!song)
          return bad("CATALOGUE_INVARIANT", "Morceau indexé introuvable.")
        return song
      })
    )
    return {
      continueCursor: page.cursor,
      isDone: page.isDone,
      page: await Promise.all(
        songs.map(async (song) => {
          const track = await ctx.db
            .query("albumTracks")
            .withIndex("by_song_id", (q) => q.eq("songId", song._id))
            .unique()
          return projectSongSummary(song, track?.albumId ?? null)
        })
      ),
    }
  },
})

export const listMyAlbums = artistQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(catalogueStatusValidator),
  },
  returns: paginationResultValidator(schema.doc("albums")),
  handler: async (ctx, args) => {
    const page = args.status
      ? await albumsByOwnerAndStatus.paginate(ctx, {
          namespace: [ctx.member._id, args.status],
          cursor: args.paginationOpts.cursor ?? undefined,
          order: "desc",
          pageSize: args.paginationOpts.numItems,
        })
      : await albumsByOwner.paginate(ctx, {
          namespace: ctx.member._id,
          cursor: args.paginationOpts.cursor ?? undefined,
          order: "desc",
          pageSize: args.paginationOpts.numItems,
        })
    return {
      continueCursor: page.cursor,
      isDone: page.isDone,
      page: await Promise.all(
        page.page.map(async ({ id }) => {
          const album = await ctx.db.get("albums", id)
          if (!album)
            return bad("CATALOGUE_INVARIANT", "Album indexé introuvable.")
          return album
        })
      ),
    }
  },
})

export const getMyCatalogueCounts = artistQuery({
  args: {},
  returns: catalogueCounts,
  handler: async (ctx) => {
    const [songTotal, songStatuses, albumTotal, albumStatuses] =
      await Promise.all([
        songsByOwner.count(ctx, { namespace: ctx.member._id }),
        songsByOwnerAndStatus.countBatch(ctx, [
          { namespace: [ctx.member._id, "draft"] },
          { namespace: [ctx.member._id, "published"] },
        ]),
        albumsByOwner.count(ctx, { namespace: ctx.member._id }),
        albumsByOwnerAndStatus.countBatch(ctx, [
          { namespace: [ctx.member._id, "draft"] },
          { namespace: [ctx.member._id, "published"] },
        ]),
      ])
    return {
      songs: {
        all: songTotal,
        draft: songStatuses[0] ?? 0,
        published: songStatuses[1] ?? 0,
      },
      albums: {
        all: albumTotal,
        draft: albumStatuses[0] ?? 0,
        published: albumStatuses[1] ?? 0,
      },
    }
  },
})

export const getMySong = artistQuery({
  args: { songId: v.id("songs") },
  returns: songDetail,
  handler: async (ctx, args) => {
    const song = await ownedSong(ctx, ctx.member._id, args.songId)
    const albumTrack = await ctx.db
      .query("albumTracks")
      .withIndex("by_song_id", (q) => q.eq("songId", song._id))
      .unique()
    const album = albumTrack
      ? await ctx.db.get("albums", albumTrack.albumId)
      : null
    return {
      song,
      lyricsText: await lyricsTextForSong(ctx, song),
      albumTrack,
      album,
      artworkUrl: song.artworkStorageId
        ? await ctx.storage.getUrl(song.artworkStorageId)
        : null,
      albumArtworkUrl: album?.artworkStorageId
        ? await ctx.storage.getUrl(album.artworkStorageId)
        : null,
    }
  },
})

export const getMyAlbum = artistQuery({
  args: { albumId: v.id("albums") },
  returns: albumDetail,
  handler: async (ctx, args) => {
    const album = await ownedAlbum(ctx, ctx.member._id, args.albumId)
    const trackPage = await albumTracksByAlbum.paginate(ctx, {
      namespace: album._id,
      order: "asc",
      pageSize: MAX_TRACKS + 1,
    })
    const rows = await Promise.all(
      trackPage.page.map(async ({ id }) => {
        const track = await ctx.db.get("albumTracks", id)
        if (!track)
          return bad("CATALOGUE_INVARIANT", "Piste indexée introuvable.")
        return track
      })
    )
    if (rows.length > MAX_TRACKS)
      bad("CATALOGUE_INVARIANT", "Trop de morceaux dans l’album.")
    const tracks = await Promise.all(
      rows.map(async (track) => {
        const song = await ctx.db.get("songs", track.songId)
        if (!song)
          return bad("CATALOGUE_INVARIANT", "Morceau d’album introuvable.")
        return { track, song }
      })
    )
    return {
      album,
      tracks,
      trackCount: await albumTracksByAlbum.count(ctx, {
        namespace: album._id,
      }),
      artworkUrl: album.artworkStorageId
        ? await ctx.storage.getUrl(album.artworkStorageId)
        : null,
    }
  },
})

export const getPublishedSong = query({
  args: { songId: v.id("songs") },
  returns: v.union(publicSongDetail, v.null()),
  handler: async (ctx, args) => {
    const song = await ctx.db.get("songs", args.songId)
    if (!song || song.status !== "published") return null
    const owner = await ctx.db.get("members", song.ownerMemberId)
    if (!owner || owner.status !== "active") return null
    const candidate = await ctx.db
      .query("albumTracks")
      .withIndex("by_song_id", (q) => q.eq("songId", song._id))
      .unique()
    const candidateAlbum = candidate
      ? await ctx.db.get("albums", candidate.albumId)
      : null
    const albumTrack =
      candidate && candidateAlbum?.status === "published" ? candidate : null
    return {
      song: projectPublicSong(song),
      lyricsText: await lyricsTextForSong(ctx, song),
      album: albumTrack
        ? {
            albumId: albumTrack.albumId,
            title: candidateAlbum!.title,
            ...(candidateAlbum!.releaseDate === undefined
              ? {}
              : { releaseDate: candidateAlbum!.releaseDate }),
          }
        : null,
      artworkUrl: song.artworkStorageId
        ? await ctx.storage.getUrl(song.artworkStorageId)
        : null,
    }
  },
})

export const getPublishedAlbum = query({
  args: { albumId: v.id("albums") },
  returns: v.union(publicAlbumDetail, v.null()),
  handler: async (ctx, args) => {
    const album = await ctx.db.get("albums", args.albumId)
    if (!album || album.status !== "published") return null
    const owner = await ctx.db.get("members", album.ownerMemberId)
    if (!owner || owner.status !== "active") return null
    const rows = await ctx.db
      .query("albumTracks")
      .withIndex("by_album_id_and_position", (q) => q.eq("albumId", album._id))
      .take(MAX_TRACKS + 1)
    if (rows.length > MAX_TRACKS)
      bad("CATALOGUE_INVARIANT", "Trop de morceaux dans l’album.")
    const tracks = (
      await Promise.all(
        rows.map(async (track) => ({
          track,
          song: await ctx.db.get("songs", track.songId),
        }))
      )
    ).flatMap((item) =>
      item.song?.status === "published" &&
      item.song.ownerMemberId === album.ownerMemberId
        ? [{ track: item.track, song: item.song }]
        : []
    )
    return {
      album: projectPublicAlbum(album),
      tracks: tracks.map(({ track, song }) => ({
        position: track.position,
        song: projectPublicSong(song),
      })),
      artworkUrl: album.artworkStorageId
        ? await ctx.storage.getUrl(album.artworkStorageId)
        : null,
    }
  },
})

type AlbumInheritance = Infer<typeof albumInheritanceValidator>

function trackInheritance(track: Doc<"albumTracks">): AlbumInheritance {
  return {
    inheritArtwork: track.inheritArtwork ?? false,
    inheritPrimaryLanguage: track.inheritPrimaryLanguage ?? false,
    inheritGenre: track.inheritGenre ?? false,
    inheritLabel: track.inheritLabel ?? false,
    inheritCredits: track.inheritCredits ?? false,
  }
}

function materializeAlbumMetadata(
  song: ReturnType<typeof validatedSong>,
  album: Doc<"albums">,
  inheritance: AlbumInheritance
) {
  const materialized: ReturnType<typeof validatedSong> & {
    artworkStorageId?: Id<"_storage">
  } = { ...song }
  if (inheritance.inheritArtwork) {
    if (album.artworkStorageId)
      materialized.artworkStorageId = album.artworkStorageId
    else delete materialized.artworkStorageId
  }
  if (inheritance.inheritPrimaryLanguage && album.primaryLanguage) {
    materialized.primaryLanguage = album.primaryLanguage
  }
  if (inheritance.inheritGenre) {
    delete materialized.genre
    delete materialized.otherGenre
    if (album.genre) materialized.genre = album.genre
    if (album.otherGenre) materialized.otherGenre = album.otherGenre
  }
  if (inheritance.inheritLabel) {
    delete materialized.label
    if (album.label) materialized.label = album.label
  }
  if (inheritance.inheritCredits) {
    delete materialized.additionalCredits
    if (album.credits.length > 0) materialized.additionalCredits = album.credits
  }
  return materialized
}

async function patchInheritedSongs(ctx: MutationCtx, album: Doc<"albums">) {
  const tracks = await ctx.db
    .query("albumTracks")
    .withIndex("by_album_id_and_position", (q) => q.eq("albumId", album._id))
    .take(MAX_TRACKS + 1)
  if (tracks.length > MAX_TRACKS)
    bad("CATALOGUE_INVARIANT", "Trop de morceaux dans l’album.")
  const now = Date.now()
  for (const track of tracks) {
    const inheritance = trackInheritance(track)
    const patch: Partial<Doc<"songs">> = {
      status: "draft",
      rightsConfirmedAt: undefined,
      updatedAt: now,
    }
    let changed = false
    if (inheritance.inheritArtwork) {
      patch.artworkStorageId = album.artworkStorageId
      changed = true
    }
    if (inheritance.inheritPrimaryLanguage && album.primaryLanguage) {
      patch.primaryLanguage = album.primaryLanguage
      changed = true
    }
    if (inheritance.inheritGenre) {
      patch.genre = album.genre
      patch.otherGenre = album.otherGenre
      changed = true
    }
    if (inheritance.inheritLabel) {
      patch.label = album.label
      changed = true
    }
    if (inheritance.inheritCredits) {
      patch.additionalCredits =
        album.credits.length > 0 ? album.credits : undefined
      changed = true
    }
    if (changed) await ctx.db.patch("songs", track.songId, patch)
  }
}

async function compactAlbumTrackPositions(
  ctx: MutationCtx,
  albumId: Id<"albums">
) {
  const tracks = await ctx.db
    .query("albumTracks")
    .withIndex("by_album_id_and_position", (q) => q.eq("albumId", albumId))
    .take(MAX_TRACKS + 1)
  if (tracks.length > MAX_TRACKS)
    bad("CATALOGUE_INVARIANT", "Trop de morceaux dans l’album.")
  const now = Date.now()
  for (const [position, track] of tracks.entries()) {
    if (track.position !== position)
      await ctx.db.patch("albumTracks", track._id, { position, updatedAt: now })
  }
}

async function setSongAlbumContext(
  ctx: MutationCtx,
  memberId: Id<"members">,
  songId: Id<"songs">,
  context: Infer<typeof albumContextValidator> | undefined
) {
  if (context === undefined) return
  const current = await ctx.db
    .query("albumTracks")
    .withIndex("by_song_id", (q) => q.eq("songId", songId))
    .unique()
  const now = Date.now()
  if (context === null) {
    if (current) {
      await ctx.db.delete("albumTracks", current._id)
      await compactAlbumTrackPositions(ctx, current.albumId)
      await ctx.db.patch("albums", current.albumId, {
        status: "draft",
        rightsConfirmedAt: undefined,
        updatedAt: now,
      })
    }
    return
  }

  await ownedAlbum(ctx, memberId, context.albumId)
  if (current && current.albumId !== context.albumId) {
    await ctx.db.delete("albumTracks", current._id)
    await compactAlbumTrackPositions(ctx, current.albumId)
    await ctx.db.patch("albums", current.albumId, {
      status: "draft",
      rightsConfirmedAt: undefined,
      updatedAt: now,
    })
  }
  if (current?.albumId === context.albumId) {
    await ctx.db.patch("albumTracks", current._id, {
      ...context.inheritance,
      updatedAt: now,
    })
  } else {
    const rows = await ctx.db
      .query("albumTracks")
      .withIndex("by_album_id_and_position", (q) =>
        q.eq("albumId", context.albumId)
      )
      .take(MAX_TRACKS + 1)
    if (rows.length >= MAX_TRACKS)
      bad("INVALID_TRACKS", "Cet album contient déjà trop de morceaux.")
    await ctx.db.insert("albumTracks", {
      albumId: context.albumId,
      songId,
      ownerMemberId: memberId,
      position:
        rows.reduce((highest, row) => Math.max(highest, row.position), -1) + 1,
      ...context.inheritance,
      createdAt: now,
      updatedAt: now,
    })
  }
  await ctx.db.patch("albums", context.albumId, {
    status: "draft",
    rightsConfirmedAt: undefined,
    updatedAt: now,
  })
}

export const createSong = artistMutation({
  args: {
    ...songInput,
    albumContext: v.optional(albumContextValidator),
  },
  returns: v.id("songs"),
  handler: async (ctx, args) => {
    const now = Date.now()
    const album = args.albumContext
      ? await ownedAlbum(ctx, ctx.member._id, args.albumContext.albumId)
      : null
    const song = album
      ? materializeAlbumMetadata(
          validatedSong(args),
          album,
          args.albumContext!.inheritance
        )
      : validatedSong(args)
    const songId = await ctx.db.insert("songs", {
      ownerMemberId: ctx.member._id,
      status: "draft",
      ...song,
      createdAt: now,
      updatedAt: now,
    })
    await setSongAlbumContext(ctx, ctx.member._id, songId, args.albumContext)
    return songId
  },
})

export const updateSong = artistMutation({
  args: {
    songId: v.id("songs"),
    ...songInput,
    albumContext: v.optional(albumContextValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const current = await ownedSong(ctx, ctx.member._id, args.songId)
    const now = Date.now()
    const album = args.albumContext
      ? await ownedAlbum(ctx, ctx.member._id, args.albumContext.albumId)
      : null
    const song = album
      ? materializeAlbumMetadata(
          validatedSong(args),
          album,
          args.albumContext!.inheritance
        )
      : validatedSong(args)
    await ctx.db.replace("songs", args.songId, {
      ownerMemberId: current.ownerMemberId,
      status: "draft",
      ...song,
      ...((!album || !args.albumContext?.inheritance.inheritArtwork) &&
      current.artworkStorageId
        ? { artworkStorageId: current.artworkStorageId }
        : {}),
      ...(current.firstPublishedAt
        ? { firstPublishedAt: current.firstPublishedAt }
        : {}),
      createdAt: current.createdAt,
      updatedAt: now,
    })
    await setSongAlbumContext(
      ctx,
      ctx.member._id,
      args.songId,
      args.albumContext
    )
    return null
  },
})

export const backfillSongLyricsText = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.object({
    migrated: v.number(),
    scheduledContinuation: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("songs").paginate({
      cursor: args.cursor,
      // Legacy lyrics may require up to 4,000 bounded line reads per song.
      // Migrate one song per transaction to stay comfortably inside Convex
      // read limits while the continuation cursor advances the full table.
      numItems: 1,
    })
    let migrated = 0
    for (const song of page.page) {
      if (song.lyricsText === undefined) {
        await ctx.db.patch("songs", song._id, {
          lyricsText: await legacyLyricsText(ctx, song._id),
        })
        migrated += 1
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.catalogue.backfillSongLyricsText,
        {
          cursor: page.continueCursor,
        }
      )
    }
    return { migrated, scheduledContinuation: !page.isDone }
  },
})

async function setSongStatus(
  ctx: MutationCtx,
  memberId: Id<"members">,
  songId: Id<"songs">,
  status: "draft" | "published"
) {
  const song = await ownedSong(ctx, memberId, songId)
  const now = Date.now()
  await ctx.db.patch("songs", songId, {
    status,
    updatedAt: now,
    ...(status === "published" && song.firstPublishedAt === undefined
      ? { firstPublishedAt: now }
      : {}),
    rightsConfirmedAt: undefined,
  })
}

export const publishSong = artistMutation({
  args: { songId: v.id("songs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await setSongStatus(ctx, ctx.member._id, args.songId, "published")
    return null
  },
})
export const unpublishSong = artistMutation({
  args: { songId: v.id("songs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await setSongStatus(ctx, ctx.member._id, args.songId, "draft")
    return null
  },
})

export const deleteSong = artistMutation({
  args: { songId: v.id("songs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const song = await ownedSong(ctx, ctx.member._id, args.songId)
    const lyrics = await readLyrics(ctx, song._id)
    const track = await ctx.db
      .query("albumTracks")
      .withIndex("by_song_id", (q) => q.eq("songId", song._id))
      .unique()

    for (const { section, lines } of lyrics) {
      for (const line of lines) await ctx.db.delete("lyricLines", line._id)
      await ctx.db.delete("songSections", section._id)
    }

    if (track) {
      await ownedAlbum(ctx, ctx.member._id, track.albumId)
      await ctx.db.delete("albumTracks", track._id)
      await compactAlbumTrackPositions(ctx, track.albumId)
      await ctx.db.patch("albums", track.albumId, {
        status: "draft",
        rightsConfirmedAt: undefined,
        updatedAt: Date.now(),
      })
    }

    await ctx.db.delete("songs", song._id)
    if (song.artworkStorageId)
      await deleteArtworkIfUnused(ctx, ctx.member._id, song.artworkStorageId)
    return null
  },
})

export const createAlbum = artistMutation({
  args: albumInput,
  returns: v.id("albums"),
  handler: async (ctx, args) => {
    const now = Date.now()
    return ctx.db.insert("albums", {
      ownerMemberId: ctx.member._id,
      status: "draft",
      ...validatedAlbum(args),
      createdAt: now,
      updatedAt: now,
    })
  },
})

async function replaceAlbumTracks(
  ctx: MutationCtx,
  memberId: Id<"members">,
  albumId: Id<"albums">,
  songIds: Array<Id<"songs">>
) {
  await ownedAlbum(ctx, memberId, albumId)
  if (songIds.length > MAX_TRACKS || new Set(songIds).size !== songIds.length)
    bad("INVALID_TRACKS", "La liste des morceaux est invalide.")
  for (const songId of songIds) {
    await ownedSong(ctx, memberId, songId)
    const association = await ctx.db
      .query("albumTracks")
      .withIndex("by_song_id", (q) => q.eq("songId", songId))
      .unique()
    if (association && association.albumId !== albumId)
      bad(
        "SONG_ALREADY_IN_ALBUM",
        "Un morceau ne peut appartenir qu’à un album."
      )
  }
  const previous = await ctx.db
    .query("albumTracks")
    .withIndex("by_album_id_and_position", (q) => q.eq("albumId", albumId))
    .take(MAX_TRACKS + 1)
  const bySong = new Map(
    previous.map((row: Doc<"albumTracks">) => [row.songId, row])
  )
  const now = Date.now()
  for (const [position, songId] of songIds.entries()) {
    const row = bySong.get(songId)
    if (row)
      await ctx.db.patch("albumTracks", row._id, { position, updatedAt: now })
    else
      await ctx.db.insert("albumTracks", {
        albumId,
        songId,
        ownerMemberId: memberId,
        position,
        createdAt: now,
        updatedAt: now,
      })
  }
  const kept = new Set(songIds)
  for (const row of previous)
    if (!kept.has(row.songId)) await ctx.db.delete("albumTracks", row._id)
  await ctx.db.patch("albums", albumId, {
    status: "draft",
    rightsConfirmedAt: undefined,
    updatedAt: now,
  })
}

export const updateAlbum = artistMutation({
  args: {
    albumId: v.id("albums"),
    songIds: v.array(v.id("songs")),
    ...albumInput,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const current = await ownedAlbum(ctx, ctx.member._id, args.albumId)
    await ctx.db.replace("albums", args.albumId, {
      ownerMemberId: current.ownerMemberId,
      status: "draft",
      ...validatedAlbum(args),
      ...(current.artworkStorageId
        ? { artworkStorageId: current.artworkStorageId }
        : {}),
      ...(current.firstPublishedAt
        ? { firstPublishedAt: current.firstPublishedAt }
        : {}),
      createdAt: current.createdAt,
      updatedAt: Date.now(),
    })
    await replaceAlbumTracks(ctx, ctx.member._id, args.albumId, args.songIds)
    const updated = await ownedAlbum(ctx, ctx.member._id, args.albumId)
    await patchInheritedSongs(ctx, updated)
    return null
  },
})

export const setAlbumTracks = artistMutation({
  args: { albumId: v.id("albums"), songIds: v.array(v.id("songs")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await replaceAlbumTracks(ctx, ctx.member._id, args.albumId, args.songIds)
    return null
  },
})

export const attachSongToAlbum = artistMutation({
  args: {
    albumId: v.id("albums"),
    songId: v.id("songs"),
    inheritance: albumInheritanceValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const album = await ownedAlbum(ctx, ctx.member._id, args.albumId)
    const song = await ownedSong(ctx, ctx.member._id, args.songId)
    const current = await ctx.db
      .query("albumTracks")
      .withIndex("by_song_id", (q) => q.eq("songId", song._id))
      .unique()
    if (current && current.albumId !== album._id)
      bad(
        "SONG_ALREADY_IN_ALBUM",
        "Ce morceau appartient déjà à un autre album."
      )
    const materialized = materializeAlbumMetadata(
      validatedSong({
        ...song,
        lyricsText: await lyricsTextForSong(ctx, song),
      }),
      album,
      args.inheritance
    )
    await ctx.db.replace("songs", song._id, {
      ownerMemberId: song.ownerMemberId,
      status: "draft",
      ...materialized,
      ...(!args.inheritance.inheritArtwork && song.artworkStorageId
        ? { artworkStorageId: song.artworkStorageId }
        : {}),
      ...(song.firstPublishedAt
        ? { firstPublishedAt: song.firstPublishedAt }
        : {}),
      createdAt: song.createdAt,
      updatedAt: Date.now(),
    })
    await setSongAlbumContext(ctx, ctx.member._id, song._id, {
      albumId: album._id,
      inheritance: args.inheritance,
    })
    return null
  },
})

export const detachSongFromAlbum = artistMutation({
  args: { albumId: v.id("albums"), songId: v.id("songs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ownedAlbum(ctx, ctx.member._id, args.albumId)
    const song = await ownedSong(ctx, ctx.member._id, args.songId)
    const track = await ctx.db
      .query("albumTracks")
      .withIndex("by_song_id", (q) => q.eq("songId", song._id))
      .unique()
    if (!track || track.albumId !== args.albumId)
      bad("NOT_FOUND", "Ce morceau ne fait pas partie de cet album.")
    await ctx.db.delete("albumTracks", track._id)
    await compactAlbumTrackPositions(ctx, args.albumId)
    const now = Date.now()
    await ctx.db.patch("songs", song._id, {
      status: "draft",
      rightsConfirmedAt: undefined,
      updatedAt: now,
    })
    await ctx.db.patch("albums", args.albumId, {
      status: "draft",
      rightsConfirmedAt: undefined,
      updatedAt: now,
    })
    return null
  },
})

export const reorderAlbumTracks = artistMutation({
  args: { albumId: v.id("albums"), songIds: v.array(v.id("songs")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const album = await ownedAlbum(ctx, ctx.member._id, args.albumId)
    const current = await ctx.db
      .query("albumTracks")
      .withIndex("by_album_id_and_position", (q) => q.eq("albumId", album._id))
      .take(MAX_TRACKS + 1)
    if (
      current.length > MAX_TRACKS ||
      args.songIds.length !== current.length ||
      new Set(args.songIds).size !== args.songIds.length ||
      current.some((track) => !args.songIds.includes(track.songId))
    ) {
      bad("INVALID_TRACKS", "La liste ordonnée des morceaux est invalide.")
    }
    const bySong = new Map(current.map((track) => [track.songId, track]))
    const now = Date.now()
    for (const [position, songId] of args.songIds.entries()) {
      const track = bySong.get(songId)
      if (!track) bad("INVALID_TRACKS", "Morceau d’album introuvable.")
      await ctx.db.patch("albumTracks", track._id, { position, updatedAt: now })
    }
    await ctx.db.patch("albums", album._id, {
      status: "draft",
      rightsConfirmedAt: undefined,
      updatedAt: now,
    })
    return null
  },
})

async function setAlbumStatus(
  ctx: MutationCtx,
  memberId: Id<"members">,
  albumId: Id<"albums">,
  status: "draft" | "published"
) {
  const album = await ownedAlbum(ctx, memberId, albumId)
  const now = Date.now()
  await ctx.db.patch("albums", albumId, {
    status,
    updatedAt: now,
    ...(status === "published" && album.firstPublishedAt === undefined
      ? { firstPublishedAt: now }
      : {}),
    rightsConfirmedAt: undefined,
  })
}

export const publishAlbum = artistMutation({
  args: { albumId: v.id("albums") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const album = await ownedAlbum(ctx, ctx.member._id, args.albumId)
    const tracks = await ctx.db
      .query("albumTracks")
      .withIndex("by_album_id_and_position", (q) => q.eq("albumId", album._id))
      .take(MAX_TRACKS + 1)
    if (tracks.length > MAX_TRACKS)
      bad("CATALOGUE_INVARIANT", "Trop de morceaux dans l’album.")
    let hasPublishedTrack = false
    for (const track of tracks) {
      const song = await ctx.db.get("songs", track.songId)
      if (
        song?.status === "published" &&
        song.ownerMemberId === ctx.member._id
      ) {
        hasPublishedTrack = true
        break
      }
    }
    if (!hasPublishedTrack)
      bad(
        "ALBUM_NEEDS_PUBLISHED_TRACK",
        "Publiez au moins un morceau avant de publier l’album."
      )
    await setAlbumStatus(ctx, ctx.member._id, args.albumId, "published")
    return null
  },
})
export const unpublishAlbum = artistMutation({
  args: { albumId: v.id("albums") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await setAlbumStatus(ctx, ctx.member._id, args.albumId, "draft")
    return null
  },
})

export const deleteAlbum = artistMutation({
  args: { albumId: v.id("albums") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const album = await ownedAlbum(ctx, ctx.member._id, args.albumId)
    const tracks = await ctx.db
      .query("albumTracks")
      .withIndex("by_album_id_and_position", (q) => q.eq("albumId", album._id))
      .take(MAX_TRACKS + 1)
    if (tracks.length > MAX_TRACKS)
      bad("CATALOGUE_INVARIANT", "Trop de morceaux dans l’album.")

    for (const track of tracks) {
      const song = await ctx.db.get("songs", track.songId)
      if (!song || song.ownerMemberId !== ctx.member._id)
        bad("CATALOGUE_INVARIANT", "Morceau d’album introuvable.")
      const inheritance = trackInheritance(track)
      const patch: Partial<Doc<"songs">> = { updatedAt: Date.now() }
      if (inheritance.inheritArtwork && album.artworkStorageId)
        patch.artworkStorageId = album.artworkStorageId
      if (inheritance.inheritPrimaryLanguage && album.primaryLanguage)
        patch.primaryLanguage = album.primaryLanguage
      if (inheritance.inheritGenre) {
        patch.genre = album.genre
        patch.otherGenre = album.otherGenre
      }
      if (inheritance.inheritLabel) patch.label = album.label
      if (inheritance.inheritCredits)
        patch.additionalCredits =
          album.credits.length > 0 ? album.credits : undefined
      await ctx.db.patch("songs", song._id, patch)
      await ctx.db.delete("albumTracks", track._id)
    }

    await ctx.db.delete("albums", album._id)
    if (album.artworkStorageId)
      await deleteArtworkIfUnused(ctx, ctx.member._id, album.artworkStorageId)
    return null
  },
})

const resourceInput = v.union(
  v.object({ kind: v.literal("song"), id: v.id("songs") }),
  v.object({ kind: v.literal("album"), id: v.id("albums") })
)

async function assertResourceOwner(
  ctx: MutationCtx,
  memberId: Id<"members">,
  resource: Infer<typeof resourceInput>
) {
  if (resource.kind === "song") return ownedSong(ctx, memberId, resource.id)
  return ownedAlbum(ctx, memberId, resource.id)
}

export const generateArtworkUploadUrl = artistMutation({
  args: { resource: resourceInput },
  returns: v.object({
    uploadUrl: v.string(),
    intentId: v.id("catalogueImageUploadIntents"),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    await assertResourceOwner(ctx, ctx.member._id, args.resource)
    await uploadLimiter.limit(ctx, "catalogueArtworkUpload", {
      key: ctx.member._id,
      throws: true,
    })
    const now = Date.now(),
      expiresAt = now + IMAGE_TTL_MS
    const intentId = await ctx.db.insert("catalogueImageUploadIntents", {
      ownerMemberId: ctx.member._id,
      kind: args.resource.kind,
      resourceId: args.resource.id,
      createdAt: now,
      expiresAt,
    })
    await ctx.scheduler.runAt(
      expiresAt,
      internal.catalogue.expireArtworkUploadIntent,
      { intentId }
    )
    return {
      uploadUrl: await ctx.storage.generateUploadUrl(),
      intentId,
      expiresAt,
    }
  },
})

export const registerArtworkUpload = artistMutation({
  args: {
    resource: resourceInput,
    intentId: v.id("catalogueImageUploadIntents"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertResourceOwner(ctx, ctx.member._id, args.resource)
    const intent = await ctx.db.get(
      "catalogueImageUploadIntents",
      args.intentId
    )
    if (
      !intent ||
      intent.ownerMemberId !== ctx.member._id ||
      intent.kind !== args.resource.kind ||
      intent.resourceId !== args.resource.id ||
      intent.expiresAt < Date.now() ||
      intent.storageId !== undefined
    )
      bad(
        "INVALID_UPLOAD_INTENT",
        "Cette autorisation d’envoi est invalide ou expirée."
      )
    const reservedIntent = await ctx.db
      .query("catalogueImageUploadIntents")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first()
    const claimedImage = await ctx.db
      .query("catalogueImages")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first()
    if (reservedIntent || claimedImage)
      bad("IMAGE_ALREADY_ATTACHED", "Cette image est déjà réservée.")
    const metadata = await ctx.db.system.get("_storage", args.storageId)
    if (!metadata || !isValidCatalogueImageMetadata(metadata, intent.createdAt))
      bad(
        "INVALID_IMAGE",
        "L’image doit être JPEG, PNG ou WebP et ne pas dépasser 10 Mo."
      )
    await ctx.db.patch("catalogueImageUploadIntents", intent._id, {
      storageId: args.storageId,
    })
    return null
  },
})

async function deleteArtworkIfUnused(
  ctx: MutationCtx,
  memberId: Id<"members">,
  storageId: Id<"_storage">
) {
  const owner = await ctx.db
    .query("catalogueImages")
    .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
    .unique()
  if (!owner || owner.ownerMemberId !== memberId) return
  const song = await ctx.db
    .query("songs")
    .withIndex("by_artwork_storage_id", (q) =>
      q.eq("artworkStorageId", storageId)
    )
    .first()
  const album = await ctx.db
    .query("albums")
    .withIndex("by_artwork_storage_id", (q) =>
      q.eq("artworkStorageId", storageId)
    )
    .unique()
  if (!song && !album) {
    await ctx.db.delete("catalogueImages", owner._id)
    await ctx.storage.delete(storageId)
  }
}

export const saveArtwork = artistMutation({
  args: {
    resource: resourceInput,
    intentId: v.id("catalogueImageUploadIntents"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const resource = await assertResourceOwner(
      ctx,
      ctx.member._id,
      args.resource
    )
    const intent = await ctx.db.get(
      "catalogueImageUploadIntents",
      args.intentId
    )
    if (
      !intent ||
      intent.ownerMemberId !== ctx.member._id ||
      intent.kind !== args.resource.kind ||
      intent.resourceId !== args.resource.id ||
      intent.expiresAt < Date.now() ||
      intent.storageId !== args.storageId
    )
      bad(
        "INVALID_UPLOAD_INTENT",
        "Cette autorisation d’envoi est invalide ou expirée."
      )
    const existingOwner = await ctx.db
      .query("catalogueImages")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique()
    if (
      existingOwner &&
      (existingOwner.ownerMemberId !== ctx.member._id ||
        existingOwner.kind !== args.resource.kind)
    ) {
      bad("FORBIDDEN", "Cette image appartient à une autre ressource.")
    }
    if (existingOwner && resource.artworkStorageId !== args.storageId) {
      bad("IMAGE_ALREADY_ATTACHED", "Cette image est déjà attachée.")
    }
    if (!existingOwner)
      await ctx.db.insert("catalogueImages", {
        ownerMemberId: ctx.member._id,
        storageId: args.storageId,
        kind: args.resource.kind,
        createdAt: Date.now(),
      })
    const previous = resource.artworkStorageId
    if (args.resource.kind === "song") {
      const songId = args.resource.id
      await ctx.db.patch("songs", songId, {
        artworkStorageId: args.storageId,
        status: "draft",
        rightsConfirmedAt: undefined,
        updatedAt: Date.now(),
      })
      const track = await ctx.db
        .query("albumTracks")
        .withIndex("by_song_id", (q) => q.eq("songId", songId))
        .unique()
      if (track)
        await ctx.db.patch("albumTracks", track._id, {
          inheritArtwork: false,
          updatedAt: Date.now(),
        })
    } else {
      await ctx.db.patch("albums", args.resource.id, {
        artworkStorageId: args.storageId,
        status: "draft",
        rightsConfirmedAt: undefined,
        updatedAt: Date.now(),
      })
      const album = await ownedAlbum(ctx, ctx.member._id, args.resource.id)
      await patchInheritedSongs(ctx, album)
    }
    await ctx.db.delete("catalogueImageUploadIntents", intent._id)
    if (previous && previous !== args.storageId)
      await deleteArtworkIfUnused(ctx, ctx.member._id, previous)
    return null
  },
})

export const expireArtworkUploadIntent = internalMutation({
  args: { intentId: v.id("catalogueImageUploadIntents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(
      "catalogueImageUploadIntents",
      args.intentId
    )
    if (intent && intent.expiresAt <= Date.now()) {
      if (
        intent.storageId &&
        !(await storageIsClaimed(ctx, intent.storageId, intent._id))
      )
        await ctx.storage.delete(intent.storageId)
      await ctx.db.delete("catalogueImageUploadIntents", intent._id)
    }
    return null
  },
})

async function storageIsClaimed(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  ignoredIntentId?: Id<"catalogueImageUploadIntents">
) {
  // This is the single exhaustive claim registry for the global storage sweep.
  // Any new table that persists a StorageId must be added here before release.
  const [catalogueImage, profileImage, song, album, profile, artistProfile] =
    await Promise.all([
      ctx.db
        .query("catalogueImages")
        .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
        .first(),
      ctx.db
        .query("profileImages")
        .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
        .first(),
      ctx.db
        .query("songs")
        .withIndex("by_artwork_storage_id", (q) =>
          q.eq("artworkStorageId", storageId)
        )
        .first(),
      ctx.db
        .query("albums")
        .withIndex("by_artwork_storage_id", (q) =>
          q.eq("artworkStorageId", storageId)
        )
        .first(),
      ctx.db
        .query("profiles")
        .withIndex("by_avatar_storage_id", (q) =>
          q.eq("avatarStorageId", storageId)
        )
        .first(),
      ctx.db
        .query("artistProfiles")
        .withIndex("by_banner_storage_id", (q) =>
          q.eq("bannerStorageId", storageId)
        )
        .first(),
    ])
  if (
    catalogueImage ||
    profileImage ||
    song ||
    album ||
    profile ||
    artistProfile
  )
    return true
  const registeredIntent = await ctx.db
    .query("catalogueImageUploadIntents")
    .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
    .first()
  return Boolean(registeredIntent && registeredIntent._id !== ignoredIntentId)
}

async function sweepUnclaimedStoragePage(ctx: MutationCtx) {
  const state = await ctx.db
    .query("storageCleanupCursors")
    .withIndex("by_key", (q) => q.eq("key", STORAGE_SWEEP_KEY))
    .unique()
  const page = await ctx.db.system.query("_storage").paginate({
    cursor: state?.cursor ?? null,
    numItems: STORAGE_SWEEP_BATCH,
  })
  const cutoff = Date.now() - IMAGE_TTL_MS
  for (const metadata of page.page) {
    if (
      metadata._creationTime <= cutoff &&
      !(await storageIsClaimed(ctx, metadata._id))
    )
      await ctx.storage.delete(metadata._id)
  }
  const cursor = page.isDone ? null : page.continueCursor
  if (state)
    await ctx.db.patch("storageCleanupCursors", state._id, {
      cursor,
      updatedAt: Date.now(),
    })
  else
    await ctx.db.insert("storageCleanupCursors", {
      key: STORAGE_SWEEP_KEY,
      cursor,
      updatedAt: Date.now(),
    })
  return page.isDone
}

async function runStorageSweep(ctx: MutationCtx) {
  if (!(await sweepUnclaimedStoragePage(ctx)))
    await ctx.scheduler.runAfter(
      0,
      internal.catalogue.sweepUnclaimedStorage,
      {}
    )
}

export const sweepUnclaimedStorage = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await runStorageSweep(ctx)
    return null
  },
})
