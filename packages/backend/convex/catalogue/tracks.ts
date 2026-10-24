import { type Infer } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import {
  MAX_TRACKS,
  type albumInheritanceValidator,
  type albumContextValidator,
  bad,
  type validatedSong,
} from "./values"
import { ownedAlbum } from "./access"

type AlbumInheritance = Infer<typeof albumInheritanceValidator>

export function trackInheritance(track: Doc<"albumTracks">): AlbumInheritance {
  return {
    inheritArtwork: track.inheritArtwork ?? false,
    inheritPrimaryLanguage: track.inheritPrimaryLanguage ?? false,
    inheritGenre: track.inheritGenre ?? false,
    inheritLabel: track.inheritLabel ?? false,
    inheritCredits: track.inheritCredits ?? false,
  }
}

export function materializeAlbumMetadata(
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

export async function patchInheritedSongs(
  ctx: MutationCtx,
  album: Doc<"albums">
) {
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

export async function compactAlbumTrackPositions(
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

export async function setSongAlbumContext(
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
