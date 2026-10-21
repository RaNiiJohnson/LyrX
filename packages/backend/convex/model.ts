import { v } from "convex/values"

export const accountRoleValidator = v.union(
  v.literal("fan"),
  v.literal("artist")
)

export const accountStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended")
)

export const customLinkValidator = v.object({
  label: v.string(),
  url: v.string(),
})

export const profileImageKindValidator = v.union(
  v.literal("avatar"),
  v.literal("banner")
)

export const catalogueStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published")
)

export const lyricSectionKindValidator = v.union(
  v.literal("intro"),
  v.literal("verse"),
  v.literal("chorus"),
  v.literal("bridge"),
  v.literal("outro"),
  v.literal("custom")
)

export const songGenreValidator = v.union(
  v.literal("pop"),
  v.literal("rock"),
  v.literal("hip-hop"),
  v.literal("rnb"),
  v.literal("electronic"),
  v.literal("jazz"),
  v.literal("folk"),
  v.literal("gospel"),
  v.literal("reggae"),
  v.literal("other")
)

export const listeningProviderValidator = v.union(
  v.literal("spotify"),
  v.literal("apple-music"),
  v.literal("youtube"),
  v.literal("deezer"),
  v.literal("soundcloud"),
  v.literal("mediafire"),
  v.literal("other")
)

export const listeningLinkValidator = v.object({
  provider: listeningProviderValidator,
  url: v.string(),
})

export const catalogueImageKindValidator = v.union(
  v.literal("song"),
  v.literal("album")
)

export type AccountRole = "fan" | "artist"
export type AccountStatus = "active" | "suspended"
export type ProfileImageKind = "avatar" | "banner"
export type CatalogueImageKind = "song" | "album"
