import { v } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { artistMutation } from "../lib/functions"
import {
  MAX_TRACKS,
  albumInheritanceValidator,
  albumInput,
  bad,
  validatedSong,
  validatedAlbum,
} from "./values"
import { ownedSong, ownedAlbum } from "./access"
import { lyricsTextForSong } from "./lyrics"
import {
  trackInheritance,
  materializeAlbumMetadata,
  patchInheritedSongs,
  compactAlbumTrackPositions,
  setSongAlbumContext,
} from "./tracks"
import { deleteArtworkIfUnused } from "./artwork"

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
    bad("INVALID_TRACKS", "The track list is invalid.")
  for (const songId of songIds) {
    await ownedSong(ctx, memberId, songId)
    const association = await ctx.db
      .query("albumTracks")
      .withIndex("by_song_id", (q) => q.eq("songId", songId))
      .unique()
    if (association && association.albumId !== albumId)
      bad("SONG_ALREADY_IN_ALBUM", "A song can belong to only one album.")
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
        "This song already belongs to another album."
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
      bad("NOT_FOUND", "This song does not belong to this album.")
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
      bad("INVALID_TRACKS", "The ordered track list is invalid.")
    }
    const bySong = new Map(current.map((track) => [track.songId, track]))
    const now = Date.now()
    for (const [position, songId] of args.songIds.entries()) {
      const track = bySong.get(songId)
      if (!track) bad("INVALID_TRACKS", "Album track not found.")
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
      bad("CATALOGUE_INVARIANT", "Too many tracks in the album.")
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
        "Publish at least one track before publishing the album."
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
      bad("CATALOGUE_INVARIANT", "Too many tracks in the album.")

    for (const track of tracks) {
      const song = await ctx.db.get("songs", track.songId)
      if (!song || song.ownerMemberId !== ctx.member._id)
        bad("CATALOGUE_INVARIANT", "Album track not found.")
      const inheritance = trackInheritance(track)
      const patch: Partial<Doc<"songs">> = { updatedAt: Date.now() }
      if (inheritance.inheritArtwork && album.artworkStorageId)
        patch.artworkStorageId = album.artworkStorageId
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
