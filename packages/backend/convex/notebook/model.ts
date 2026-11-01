import { v } from "convex/values"

export const MAX_COLLECTIONS = 40
export const MAX_PASSAGES = 500
export const MAX_EXCERPT = 1000
export const collectionId = v.union(v.id("notebookCollections"), v.null())
export const snapshot = v.object({
  text: v.string(),
  fingerprint: v.string(),
  start: v.number(),
  end: v.number(),
  title: v.string(),
  primaryArtist: v.string(),
})
export const passageCard = v.object({
  id: v.id("notebookPassages"),
  collectionId,
  savedAt: v.number(),
  source: v.union(
    v.null(),
    v.object({
      href: v.string(),
      title: v.string(),
      primaryArtist: v.string(),
      artworkUrl: v.union(v.string(), v.null()),
      origin: v.union(v.literal("artist"), v.literal("community")),
    })
  ),
  text: v.union(v.string(), v.null()),
  state: v.union(
    v.literal("current"),
    v.literal("changed"),
    v.literal("unavailable")
  ),
})
