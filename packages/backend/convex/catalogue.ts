import { ConvexError, v } from "convex/values"
import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter"

import { components, internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, query } from "./_generated/server"
import schema from "./schema"
import {
  listeningLinkValidator,
  lyricSectionKindValidator,
  songGenreValidator,
} from "./model"
import { artistMutation, artistQuery } from "./lib/functions"

const MAX_SECTIONS = 40
const MAX_LINES_PER_SECTION = 100
const MAX_TOTAL_LINES = 1_000
const MAX_TRACKS = 100
const IMAGE_TTL_MS = 10 * MINUTE
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const uploadLimiter = new RateLimiter(components.rateLimiter, {
  catalogueArtworkUpload: {
    kind: "fixed window",
    rate: 5,
    period: IMAGE_TTL_MS,
  },
})

const lineInput = v.object({
  id: v.optional(v.id("lyricLines")),
  text: v.string(),
})

const sectionInput = v.object({
  id: v.optional(v.id("songSections")),
  kind: lyricSectionKindValidator,
  customLabel: v.optional(v.string()),
  lines: v.array(lineInput),
})

const songInput = {
  title: v.string(),
  primaryArtist: v.string(),
  guestArtists: v.array(v.string()),
  releaseDate: v.optional(v.number()),
  description: v.optional(v.string()),
  context: v.optional(v.string()),
  primaryLanguage: v.string(),
  genre: v.optional(songGenreValidator),
  otherGenre: v.optional(v.string()),
  writers: v.array(v.string()),
  composers: v.array(v.string()),
  producers: v.array(v.string()),
  label: v.optional(v.string()),
  listeningLinks: v.array(listeningLinkValidator),
  sections: v.array(sectionInput),
}

const albumInput = {
  title: v.string(),
  releaseDate: v.optional(v.number()),
  description: v.optional(v.string()),
  credits: v.array(v.string()),
}

const sectionWithLines = v.object({
  section: schema.doc("songSections"),
  lines: v.array(schema.doc("lyricLines")),
})

const songDetail = v.object({
  song: schema.doc("songs"),
  sections: v.array(sectionWithLines),
  albumTrack: v.union(schema.doc("albumTracks"), v.null()),
  artworkUrl: v.union(v.string(), v.null()),
})

const albumTrackDetail = v.object({
  track: schema.doc("albumTracks"),
  song: schema.doc("songs"),
})

const albumDetail = v.object({
  album: schema.doc("albums"),
  tracks: v.array(albumTrackDetail),
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

function validatedSong(args: typeof songInput extends never ? never : any) {
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
    primaryLanguage: text(args.primaryLanguage, 50, "La langue"),
    ...(args.genre === undefined ? {} : { genre: args.genre }),
    ...(args.genre === "other"
      ? { otherGenre: text(args.otherGenre, 60, "Le genre") }
      : {}),
    writers: textList(args.writers, 30, "Les auteurs"),
    composers: textList(args.composers, 30, "Les compositeurs"),
    producers: textList(args.producers, 30, "Les producteurs"),
    ...(optionalText(args.label, 120, "Le label")
      ? { label: optionalText(args.label, 120, "Le label") }
      : {}),
    listeningLinks: args.listeningLinks.map(
      (link: { provider: string; url: string }) => ({
        provider: link.provider,
        url: validateUrl(link.provider, link.url),
      })
    ),
  }
}

function validateLyrics(
  sections: Array<{
    kind: string
    customLabel?: string
    lines: Array<{ text: string }>
  }>
) {
  if (sections.length > MAX_SECTIONS) bad("INVALID_LYRICS", "Trop de sections.")
  let total = 0
  for (const section of sections) {
    if (section.lines.length > MAX_LINES_PER_SECTION)
      bad("INVALID_LYRICS", "Trop de lignes dans une section.")
    total += section.lines.length
    if (section.kind === "custom")
      text(section.customLabel ?? "", 80, "Le nom de section")
    else if (section.customLabel !== undefined)
      bad(
        "INVALID_LYRICS",
        "Seule une section personnalisée peut avoir un nom."
      )
    for (const line of section.lines) text(line.text, 1_000, "Une ligne")
  }
  if (total > MAX_TOTAL_LINES)
    bad("INVALID_LYRICS", "Les paroles sont trop longues.")
}

async function ownedSong(
  ctx: any,
  memberId: Id<"members">,
  songId: Id<"songs">
) {
  const song = await ctx.db.get("songs", songId)
  if (!song || song.ownerMemberId !== memberId)
    bad("NOT_FOUND", "Morceau introuvable.")
  return song as Doc<"songs">
}

async function ownedAlbum(
  ctx: any,
  memberId: Id<"members">,
  albumId: Id<"albums">
) {
  const album = await ctx.db.get("albums", albumId)
  if (!album || album.ownerMemberId !== memberId)
    bad("NOT_FOUND", "Album introuvable.")
  return album as Doc<"albums">
}

async function readLyrics(ctx: any, songId: Id<"songs">) {
  const sections = await ctx.db
    .query("songSections")
    .withIndex("by_song_id_and_position", (q: any) => q.eq("songId", songId))
    .take(MAX_SECTIONS + 1)
  if (sections.length > MAX_SECTIONS)
    bad("CATALOGUE_INVARIANT", "Trop de sections enregistrées.")
  return Promise.all(
    sections.map(async (section: Doc<"songSections">) => {
      const lines = await ctx.db
        .query("lyricLines")
        .withIndex("by_section_id_and_position", (q: any) =>
          q.eq("sectionId", section._id)
        )
        .take(MAX_LINES_PER_SECTION + 1)
      if (lines.length > MAX_LINES_PER_SECTION)
        bad("CATALOGUE_INVARIANT", "Trop de lignes enregistrées.")
      return { section, lines }
    })
  )
}

async function replaceLyrics(
  ctx: any,
  songId: Id<"songs">,
  sections: Array<any>,
  now: number
) {
  validateLyrics(sections)
  const existing = await ctx.db
    .query("songSections")
    .withIndex("by_song_id_and_position", (q: any) => q.eq("songId", songId))
    .take(MAX_SECTIONS + 1)
  if (existing.length > MAX_SECTIONS)
    bad("CATALOGUE_INVARIANT", "Trop de sections enregistrées.")
  const keptSections = new Set<string>()
  for (const [position, input] of sections.entries()) {
    let sectionId: Id<"songSections">
    let createdAt = now
    if (input.id) {
      const current = await ctx.db.get("songSections", input.id)
      if (!current || current.songId !== songId)
        bad("INVALID_LYRICS", "Section invalide.")
      sectionId = current._id
      createdAt = current.createdAt
      await ctx.db.replace("songSections", sectionId, {
        songId,
        kind: input.kind,
        ...(input.kind === "custom"
          ? { customLabel: text(input.customLabel, 80, "Le nom de section") }
          : {}),
        position,
        createdAt,
        updatedAt: now,
      })
    } else {
      sectionId = await ctx.db.insert("songSections", {
        songId,
        kind: input.kind,
        ...(input.kind === "custom"
          ? { customLabel: text(input.customLabel, 80, "Le nom de section") }
          : {}),
        position,
        createdAt,
        updatedAt: now,
      })
    }
    keptSections.add(sectionId)
    const oldLines = await ctx.db
      .query("lyricLines")
      .withIndex("by_section_id_and_position", (q: any) =>
        q.eq("sectionId", sectionId)
      )
      .take(MAX_LINES_PER_SECTION + 1)
    if (oldLines.length > MAX_LINES_PER_SECTION)
      bad("CATALOGUE_INVARIANT", "Trop de lignes enregistrées.")
    const keptLines = new Set<string>()
    for (const [linePosition, line] of input.lines.entries()) {
      if (line.id) {
        const current = await ctx.db.get("lyricLines", line.id)
        if (
          !current ||
          current.songId !== songId ||
          current.sectionId !== sectionId
        )
          bad("INVALID_LYRICS", "Ligne invalide.")
        keptLines.add(current._id)
        await ctx.db.patch("lyricLines", current._id, {
          text: text(line.text, 1_000, "Une ligne"),
          position: linePosition,
          updatedAt: now,
        })
      } else {
        const id = await ctx.db.insert("lyricLines", {
          songId,
          sectionId,
          text: text(line.text, 1_000, "Une ligne"),
          position: linePosition,
          createdAt: now,
          updatedAt: now,
        })
        keptLines.add(id)
      }
    }
    for (const line of oldLines)
      if (!keptLines.has(line._id)) await ctx.db.delete("lyricLines", line._id)
  }
  for (const section of existing) {
    if (keptSections.has(section._id)) continue
    const lines = await ctx.db
      .query("lyricLines")
      .withIndex("by_section_id_and_position", (q: any) =>
        q.eq("sectionId", section._id)
      )
      .take(MAX_LINES_PER_SECTION + 1)
    for (const line of lines) await ctx.db.delete("lyricLines", line._id)
    await ctx.db.delete("songSections", section._id)
  }
}

export const listMySongs = artistQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(schema.doc("songs")),
  handler: async (ctx, args) =>
    ctx.db
      .query("songs")
      .withIndex("by_owner_member_id", (q) =>
        q.eq("ownerMemberId", ctx.member._id)
      )
      .order("desc")
      .take(Math.min(Math.max(args.limit ?? 50, 1), 100)),
})

export const listMyAlbums = artistQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(schema.doc("albums")),
  handler: async (ctx, args) =>
    ctx.db
      .query("albums")
      .withIndex("by_owner_member_id", (q) =>
        q.eq("ownerMemberId", ctx.member._id)
      )
      .order("desc")
      .take(Math.min(Math.max(args.limit ?? 50, 1), 100)),
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
    return {
      song,
      sections: await readLyrics(ctx, song._id),
      albumTrack,
      artworkUrl: song.artworkStorageId
        ? await ctx.storage.getUrl(song.artworkStorageId)
        : null,
    }
  },
})

export const getMyAlbum = artistQuery({
  args: { albumId: v.id("albums") },
  returns: albumDetail,
  handler: async (ctx, args) => {
    const album = await ownedAlbum(ctx, ctx.member._id, args.albumId)
    const rows = await ctx.db
      .query("albumTracks")
      .withIndex("by_album_id_and_position", (q) => q.eq("albumId", album._id))
      .take(MAX_TRACKS + 1)
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
      artworkUrl: album.artworkStorageId
        ? await ctx.storage.getUrl(album.artworkStorageId)
        : null,
    }
  },
})

export const getPublishedSong = query({
  args: { songId: v.id("songs") },
  returns: v.union(songDetail, v.null()),
  handler: async (ctx, args) => {
    const song = await ctx.db.get("songs", args.songId)
    if (!song || song.status !== "published") return null
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
      song,
      sections: await readLyrics(ctx, song._id),
      albumTrack,
      artworkUrl: song.artworkStorageId
        ? await ctx.storage.getUrl(song.artworkStorageId)
        : null,
    }
  },
})

export const getPublishedAlbum = query({
  args: { albumId: v.id("albums") },
  returns: v.union(albumDetail, v.null()),
  handler: async (ctx, args) => {
    const album = await ctx.db.get("albums", args.albumId)
    if (!album || album.status !== "published") return null
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
      album,
      tracks,
      artworkUrl: album.artworkStorageId
        ? await ctx.storage.getUrl(album.artworkStorageId)
        : null,
    }
  },
})

export const createSong = artistMutation({
  args: songInput,
  returns: v.id("songs"),
  handler: async (ctx, args) => {
    validateLyrics(args.sections)
    const now = Date.now()
    const songId = await ctx.db.insert("songs", {
      ownerMemberId: ctx.member._id,
      status: "draft",
      ...validatedSong(args),
      createdAt: now,
      updatedAt: now,
    })
    await replaceLyrics(ctx, songId, args.sections, now)
    return songId
  },
})

export const updateSong = artistMutation({
  args: { songId: v.id("songs"), ...songInput },
  returns: v.null(),
  handler: async (ctx, args) => {
    const current = await ownedSong(ctx, ctx.member._id, args.songId)
    const now = Date.now()
    await ctx.db.replace("songs", args.songId, {
      ownerMemberId: current.ownerMemberId,
      status: current.status,
      ...validatedSong(args),
      ...(current.artworkStorageId
        ? { artworkStorageId: current.artworkStorageId }
        : {}),
      ...(current.firstPublishedAt
        ? { firstPublishedAt: current.firstPublishedAt }
        : {}),
      createdAt: current.createdAt,
      updatedAt: now,
    })
    await replaceLyrics(ctx, args.songId, args.sections, now)
    return null
  },
})

async function setSongStatus(
  ctx: any,
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

export const createAlbum = artistMutation({
  args: albumInput,
  returns: v.id("albums"),
  handler: async (ctx, args) => {
    const now = Date.now()
    return ctx.db.insert("albums", {
      ownerMemberId: ctx.member._id,
      status: "draft",
      title: text(args.title, 160, "Le titre"),
      ...(optionalDate(args.releaseDate) === undefined
        ? {}
        : { releaseDate: optionalDate(args.releaseDate) }),
      ...(optionalText(args.description, 5_000, "La description")
        ? {
            description: optionalText(
              args.description,
              5_000,
              "La description"
            ),
          }
        : {}),
      credits: textList(args.credits, 50, "Les crédits"),
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateAlbum = artistMutation({
  args: { albumId: v.id("albums"), ...albumInput },
  returns: v.null(),
  handler: async (ctx, args) => {
    const current = await ownedAlbum(ctx, ctx.member._id, args.albumId)
    await ctx.db.replace("albums", args.albumId, {
      ownerMemberId: current.ownerMemberId,
      status: current.status,
      title: text(args.title, 160, "Le titre"),
      ...(optionalDate(args.releaseDate) === undefined
        ? {}
        : { releaseDate: optionalDate(args.releaseDate) }),
      ...(optionalText(args.description, 5_000, "La description")
        ? {
            description: optionalText(
              args.description,
              5_000,
              "La description"
            ),
          }
        : {}),
      credits: textList(args.credits, 50, "Les crédits"),
      ...(current.artworkStorageId
        ? { artworkStorageId: current.artworkStorageId }
        : {}),
      ...(current.firstPublishedAt
        ? { firstPublishedAt: current.firstPublishedAt }
        : {}),
      createdAt: current.createdAt,
      updatedAt: Date.now(),
    })
    return null
  },
})

export const setAlbumTracks = artistMutation({
  args: { albumId: v.id("albums"), songIds: v.array(v.id("songs")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ownedAlbum(ctx, ctx.member._id, args.albumId)
    if (
      args.songIds.length > MAX_TRACKS ||
      new Set(args.songIds).size !== args.songIds.length
    )
      bad("INVALID_TRACKS", "La liste des morceaux est invalide.")
    for (const songId of args.songIds) {
      await ownedSong(ctx, ctx.member._id, songId)
      const association = await ctx.db
        .query("albumTracks")
        .withIndex("by_song_id", (q) => q.eq("songId", songId))
        .unique()
      if (association && association.albumId !== args.albumId)
        bad(
          "SONG_ALREADY_IN_ALBUM",
          "Un morceau ne peut appartenir qu’à un album."
        )
    }
    const previous = await ctx.db
      .query("albumTracks")
      .withIndex("by_album_id_and_position", (q) =>
        q.eq("albumId", args.albumId)
      )
      .take(MAX_TRACKS + 1)
    const bySong = new Map(previous.map((row) => [row.songId, row]))
    const now = Date.now()
    for (const [position, songId] of args.songIds.entries()) {
      const row = bySong.get(songId)
      if (row)
        await ctx.db.patch("albumTracks", row._id, { position, updatedAt: now })
      else
        await ctx.db.insert("albumTracks", {
          albumId: args.albumId,
          songId,
          ownerMemberId: ctx.member._id,
          position,
          createdAt: now,
          updatedAt: now,
        })
    }
    const kept = new Set(args.songIds)
    for (const row of previous)
      if (!kept.has(row.songId)) await ctx.db.delete("albumTracks", row._id)
    await ctx.db.patch("albums", args.albumId, { updatedAt: now })
    return null
  },
})

async function setAlbumStatus(
  ctx: any,
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
  })
}

export const publishAlbum = artistMutation({
  args: { albumId: v.id("albums") },
  returns: v.null(),
  handler: async (ctx, args) => {
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

const resourceInput = v.union(
  v.object({ kind: v.literal("song"), id: v.id("songs") }),
  v.object({ kind: v.literal("album"), id: v.id("albums") })
)

async function assertResourceOwner(
  ctx: any,
  memberId: Id<"members">,
  resource: any
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

async function deleteArtworkIfUnused(
  ctx: any,
  memberId: Id<"members">,
  storageId: Id<"_storage">
) {
  const owner = await ctx.db
    .query("catalogueImages")
    .withIndex("by_storage_id", (q: any) => q.eq("storageId", storageId))
    .unique()
  if (!owner || owner.ownerMemberId !== memberId) return
  const song = await ctx.db
    .query("songs")
    .withIndex("by_artwork_storage_id", (q: any) =>
      q.eq("artworkStorageId", storageId)
    )
    .unique()
  const album = await ctx.db
    .query("albums")
    .withIndex("by_artwork_storage_id", (q: any) =>
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
      intent.expiresAt < Date.now()
    )
      bad(
        "INVALID_UPLOAD_INTENT",
        "Cette autorisation d’envoi est invalide ou expirée."
      )
    const metadata = await ctx.db.system.get("_storage", args.storageId)
    if (
      !metadata ||
      metadata._creationTime < intent.createdAt ||
      !["image/jpeg", "image/png", "image/webp"].includes(
        metadata.contentType ?? ""
      ) ||
      metadata.size > MAX_IMAGE_BYTES
    )
      bad(
        "INVALID_IMAGE",
        "L’image doit être JPEG, PNG ou WebP et ne pas dépasser 10 Mo."
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
    if (args.resource.kind === "song")
      await ctx.db.patch("songs", args.resource.id, {
        artworkStorageId: args.storageId,
        updatedAt: Date.now(),
      })
    else
      await ctx.db.patch("albums", args.resource.id, {
        artworkStorageId: args.storageId,
        updatedAt: Date.now(),
      })
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
    if (intent && intent.expiresAt <= Date.now())
      await ctx.db.delete("catalogueImageUploadIntents", intent._id)
    return null
  },
})
