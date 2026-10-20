import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

import {
  accountRoleValidator,
  accountStatusValidator,
  customLinkValidator,
  profileImageKindValidator,
} from "./model"

export default defineSchema({
  members: defineTable({
    authUserId: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    role: accountRoleValidator,
    status: accountStatusValidator,
    isAdmin: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user_id", ["authUserId"])
    .index("by_email", ["email"])
    .index("by_is_admin", ["isAdmin"]),

  profiles: defineTable({
    memberId: v.id("members"),
    handle: v.string(),
    handleNormalized: v.string(),
    displayName: v.string(),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_member_id", ["memberId"])
    .index("by_handle_normalized", ["handleNormalized"])
    .index("by_avatar_storage_id", ["avatarStorageId"]),

  artistProfiles: defineTable({
    memberId: v.id("members"),
    bannerStorageId: v.optional(v.id("_storage")),
    presentation: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    tiktokUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    spotifyUrl: v.optional(v.string()),
    customLinks: v.array(customLinkValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_member_id", ["memberId"])
    .index("by_banner_storage_id", ["bannerStorageId"]),

  profileImageUploadIntents: defineTable({
    memberId: v.id("members"),
    kind: profileImageKindValidator,
    createdAt: v.number(),
    expiresAt: v.number(),
  }),

  profileImages: defineTable({
    memberId: v.id("members"),
    storageId: v.id("_storage"),
    kind: profileImageKindValidator,
    createdAt: v.number(),
  })
    .index("by_storage_id", ["storageId"])
    .index("by_member_id_and_kind", ["memberId", "kind"]),
})
