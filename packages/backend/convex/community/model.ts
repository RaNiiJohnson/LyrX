import { v } from "convex/values"
import { listeningLinkValidator, songGenreValidator } from "../model"

export const contributionMetadata = {
  guestArtists: v.optional(v.array(v.string())),
  releaseDate: v.optional(v.number()),
  description: v.optional(v.string()),
  context: v.optional(v.string()),
  genre: v.optional(songGenreValidator),
  otherGenre: v.optional(v.string()),
  writers: v.optional(v.array(v.string())),
  composers: v.optional(v.array(v.string())),
  producers: v.optional(v.array(v.string())),
  label: v.optional(v.string()),
  additionalCredits: v.optional(v.array(v.string())),
  listeningLinks: v.optional(v.array(listeningLinkValidator)),
}

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
  ...contributionMetadata,
  title: v.string(),
  primaryArtist: v.string(),
  lyricsText: v.string(),
  albumTitle: v.optional(v.string()),
}
