import type { Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { bad } from "./values"

export async function ownedSong(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<"members">,
  songId: Id<"songs">
) {
  const song = await ctx.db.get("songs", songId)
  if (!song || song.ownerMemberId !== memberId)
    bad("NOT_FOUND", "Morceau introuvable.")
  return song
}

export async function ownedAlbum(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<"members">,
  albumId: Id<"albums">
) {
  const album = await ctx.db.get("albums", albumId)
  if (!album || album.ownerMemberId !== memberId)
    bad("NOT_FOUND", "Album introuvable.")
  return album
}
