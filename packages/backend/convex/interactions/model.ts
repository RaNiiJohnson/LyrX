import { v } from "convex/values"

export const sourceId = v.union(v.id("songs"), v.id("communityContributions"))
export const commentStatus = v.union(
  v.literal("public"),
  v.literal("deleted"),
  v.literal("removed")
)
export const reportStatus = v.union(v.literal("open"), v.literal("resolved"))
export const reportCategory = v.union(
  v.literal("spam"),
  v.literal("abuse"),
  v.literal("inappropriate"),
  v.literal("other")
)
export const decision = v.union(v.literal("dismiss"), v.literal("remove"))
export const songCard = v.object({
  id: v.string(),
  origin: v.union(v.literal("artist"), v.literal("community")),
  title: v.string(),
  primaryArtist: v.string(),
  href: v.string(),
})
export const commentCard = v.object({
  id: v.id("songComments"),
  body: v.string(),
  createdAt: v.number(),
  author: v.object({
    handle: v.string(),
    displayName: v.string(),
    avatarUrl: v.union(v.string(), v.null()),
    role: v.union(v.literal("artist"), v.literal("fan")),
  }),
  isOwn: v.boolean(),
  canReport: v.boolean(),
})
