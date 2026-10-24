import { v } from "convex/values"
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server"
import { query } from "../_generated/server"
import schema from "../schema"
import { catalogueStatusValidator } from "../model"
import { artistQuery } from "../lib/functions"
import {
  albumsByOwner,
  albumsByOwnerAndStatus,
  albumTracksByAlbum,
  songsByOwner,
  songsByOwnerAndStatus,
} from "./aggregates"
import {
  MAX_TRACKS,
  songDetail,
  albumDetail,
  catalogueCounts,
  songSummary,
  publicSongDetail,
  publicAlbumDetail,
  bad,
  projectPublicSong,
  projectPublicAlbum,
  projectSongSummary,
} from "./values"
import { ownedSong, ownedAlbum } from "./access"
import { lyricsTextForSong } from "./lyrics"

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
