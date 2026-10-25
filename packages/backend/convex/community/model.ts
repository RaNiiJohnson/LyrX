import { v } from "convex/values"

export const contributionStatus = v.union(
  v.literal("published"),
  v.literal("hidden"),
  v.literal("removed")
)
export const reportStatus = v.union(v.literal("open"), v.literal("resolved"))
export const moderationAction = v.union(
  v.literal("dismiss"),
  v.literal("hide"),
  v.literal("remove")
)
export const contributionInput = {
  title: v.string(),
  primaryArtist: v.string(),
  lyricsText: v.string(),
  albumTitle: v.optional(v.string()),
}
