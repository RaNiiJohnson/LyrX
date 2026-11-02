import type { Doc } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"

/**
 * Small public facts shown on song rows in list views: the album title (only
 * when that album is itself published) and the public like count. Reads are
 * bounded: one album-track lookup, one album, one counter document.
 */
export async function songListingExtras(
  ctx: QueryCtx,
  source: Doc<"songs"> | Doc<"communityContributions">
) {
  const [albumTitle, likes] = await Promise.all([
    "ownerMemberId" in source
      ? publishedAlbumTitle(ctx, source)
      : Promise.resolve(source.albumTitle ?? null),
    ctx.db
      .query("songLikeCounts")
      .withIndex("by_source_id", (q) => q.eq("sourceId", source._id))
      .unique(),
  ])
  return { albumTitle, likeCount: likes?.count ?? 0 }
}

async function publishedAlbumTitle(ctx: QueryCtx, song: Doc<"songs">) {
  const track = await ctx.db
    .query("albumTracks")
    .withIndex("by_song_id", (q) => q.eq("songId", song._id))
    .unique()
  if (!track) return null
  const album = await ctx.db.get("albums", track.albumId)
  return album?.status === "published" &&
    album.ownerMemberId === song.ownerMemberId
    ? album.title
    : null
}
