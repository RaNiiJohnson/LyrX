import { v } from "convex/values"
import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { artistMutation } from "../lib/functions"
import {
  songInput,
  albumContextValidator,
  validatedSong,
  validateLyricsText,
} from "./values"
import { ownedSong, ownedAlbum } from "./access"
import { readLyrics, lyricsTextForSong } from "./lyrics"
import {
  materializeAlbumMetadata,
  compactAlbumTrackPositions,
  setSongAlbumContext,
} from "./tracks"
import { deleteArtworkIfUnused } from "./artwork"

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

async function setSongStatus(
  ctx: MutationCtx,
  memberId: Id<"members">,
  songId: Id<"songs">,
  status: "draft" | "published"
) {
  const song = await ownedSong(ctx, memberId, songId)
  if (status === "published") {
    validateLyricsText(await lyricsTextForSong(ctx, song))
  }
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
