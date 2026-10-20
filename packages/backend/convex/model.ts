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

export type AccountRole = "fan" | "artist"
export type AccountStatus = "active" | "suspended"
export type ProfileImageKind = "avatar" | "banner"
