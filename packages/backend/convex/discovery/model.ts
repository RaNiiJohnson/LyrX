import { v } from "convex/values"
import { songGenreValidator } from "../model"

export const origin = v.union(v.literal("artist"), v.literal("community"))
export const kind = v.union(
  v.literal("song"),
  v.literal("album"),
  v.literal("artist")
)
export const sort = v.union(
  v.literal("newest"),
  v.literal("title"),
  v.literal("popular")
)
export const sourceId = v.union(
  v.id("songs"),
  v.id("communityContributions"),
  v.id("albums"),
  v.id("members")
)
export const phase = v.union(
  v.literal("songs"),
  v.literal("community"),
  v.literal("albums"),
  v.literal("artists")
)
export const songCard = v.object({
  id: v.string(),
  origin,
  title: v.string(),
  primaryArtist: v.string(),
  artworkUrl: v.union(v.string(), v.null()),
  firstPublishedAt: v.number(),
  href: v.string(),
  genre: v.optional(songGenreValidator),
  recentViews: v.number(),
})
export const albumCard = v.object({
  id: v.string(),
  title: v.string(),
  artistName: v.string(),
  artistHandle: v.string(),
  artworkUrl: v.union(v.string(), v.null()),
  firstPublishedAt: v.number(),
  href: v.string(),
  publishedTrackCount: v.number(),
})
export const artistCard = v.object({
  handle: v.string(),
  displayName: v.string(),
  avatarUrl: v.union(v.string(), v.null()),
  songCount: v.number(),
  albumCount: v.number(),
  href: v.string(),
})
export const pageArgs = {
  page: v.number(),
  pageSize: v.optional(v.number()),
  sort: v.optional(sort),
}
export const pageFields = {
  ready: v.boolean(),
  total: v.number(),
  page: v.number(),
  pageSize: v.number(),
  pageCount: v.number(),
}
