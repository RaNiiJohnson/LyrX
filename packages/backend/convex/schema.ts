import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import {
  contributionInput,
  contributionStatus,
  moderationAction,
  reportStatus,
} from "./community/model"

import {
  accountRoleValidator,
  accountStatusValidator,
  catalogueImageKindValidator,
  catalogueStatusValidator,
  customLinkValidator,
  listeningLinkValidator,
  lyricSectionKindValidator,
  profileImageKindValidator,
  songGenreValidator,
} from "./model"

export default defineSchema({
  // Minimal permanent revocation marker: an unexpired JWT must not recreate a
  // deleted account. New sign-ups receive a different authentication identity.
  accountDeletions: defineTable({
    authUserId: v.string(),
    requestedAt: v.number(),
  }).index("by_auth_user_id", ["authUserId"]),

  accountDeletionJobs: defineTable({
    memberId: v.id("members"),
    phase: v.union(
      v.literal("songs"),
      v.literal("tracks"),
      v.literal("albums"),
      v.literal("profiles"),
      v.literal("artistProfiles"),
      v.literal("profileIntents"),
      v.literal("catalogueIntents"),
      v.literal("profileImages"),
      v.literal("catalogueImages"),
      v.literal("member")
    ),
    updatedAt: v.number(),
  })
    .index("by_member_id", ["memberId"])
    .index("by_updated_at", ["updatedAt"]),

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
  }).index("by_member_id", ["memberId"]),

  profileImages: defineTable({
    memberId: v.id("members"),
    storageId: v.id("_storage"),
    kind: profileImageKindValidator,
    createdAt: v.number(),
  })
    .index("by_storage_id", ["storageId"])
    .index("by_member_id_and_kind", ["memberId", "kind"]),

  songs: defineTable({
    ownerMemberId: v.id("members"),
    status: catalogueStatusValidator,
    title: v.string(),
    primaryArtist: v.string(),
    guestArtists: v.array(v.string()),
    releaseDate: v.optional(v.number()),
    description: v.optional(v.string()),
    context: v.optional(v.string()),
    genre: v.optional(songGenreValidator),
    otherGenre: v.optional(v.string()),
    writers: v.array(v.string()),
    composers: v.array(v.string()),
    producers: v.array(v.string()),
    label: v.optional(v.string()),
    additionalCredits: v.optional(v.array(v.string())),
    listeningLinks: v.array(listeningLinkValidator),
    // Optional until the legacy songSections/lyricLines data has been backfilled.
    lyricsText: v.optional(v.string()),
    artworkStorageId: v.optional(v.id("_storage")),
    firstPublishedAt: v.optional(v.number()),
    rightsConfirmedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_member_id", ["ownerMemberId"])
    .index("by_owner_member_id_and_status", ["ownerMemberId", "status"])
    .index("by_status", ["status"])
    .index("by_artwork_storage_id", ["artworkStorageId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status"],
    }),

  songSections: defineTable({
    songId: v.id("songs"),
    kind: lyricSectionKindValidator,
    customLabel: v.optional(v.string()),
    position: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_song_id_and_position", ["songId", "position"]),

  lyricLines: defineTable({
    songId: v.id("songs"),
    sectionId: v.id("songSections"),
    text: v.string(),
    position: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_section_id_and_position", ["sectionId", "position"])
    .index("by_song_id", ["songId"]),

  albums: defineTable({
    ownerMemberId: v.id("members"),
    status: catalogueStatusValidator,
    title: v.string(),
    releaseDate: v.optional(v.number()),
    description: v.optional(v.string()),
    genre: v.optional(songGenreValidator),
    otherGenre: v.optional(v.string()),
    label: v.optional(v.string()),
    credits: v.array(v.string()),
    artworkStorageId: v.optional(v.id("_storage")),
    firstPublishedAt: v.optional(v.number()),
    rightsConfirmedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_member_id", ["ownerMemberId"])
    .index("by_owner_member_id_and_status", ["ownerMemberId", "status"])
    .index("by_status", ["status"])
    .index("by_artwork_storage_id", ["artworkStorageId"]),

  albumTracks: defineTable({
    albumId: v.id("albums"),
    songId: v.id("songs"),
    ownerMemberId: v.id("members"),
    position: v.number(),
    inheritArtwork: v.optional(v.boolean()),
    inheritGenre: v.optional(v.boolean()),
    inheritLabel: v.optional(v.boolean()),
    inheritCredits: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_album_id_and_position", ["albumId", "position"])
    .index("by_song_id", ["songId"])
    .index("by_owner_member_id", ["ownerMemberId"]),

  catalogueImageUploadIntents: defineTable({
    ownerMemberId: v.id("members"),
    kind: catalogueImageKindValidator,
    resourceId: v.union(v.id("songs"), v.id("albums")),
    storageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_storage_id", ["storageId"])
    .index("by_owner_member_id", ["ownerMemberId"]),

  catalogueImages: defineTable({
    ownerMemberId: v.id("members"),
    storageId: v.id("_storage"),
    kind: catalogueImageKindValidator,
    createdAt: v.number(),
  })
    .index("by_storage_id", ["storageId"])
    .index("by_owner_member_id_and_kind", ["ownerMemberId", "kind"]),

  storageCleanupCursors: defineTable({
    key: v.string(),
    cursor: v.union(v.string(), v.null()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  communityContributions: defineTable({
    ...contributionInput,
    artworkStorageId: v.optional(v.id("_storage")),
    authorMemberId: v.id("members"),
    requestId: v.string(),
    status: contributionStatus,
    revision: v.number(),
    firstPublishedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author_member_id", ["authorMemberId"])
    .index("by_artwork_storage_id", ["artworkStorageId"])
    .index("by_author_member_id_and_request_id", [
      "authorMemberId",
      "requestId",
    ])
    .index("by_status_and_first_published_at", ["status", "firstPublishedAt"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status"],
    }),

  communityReports: defineTable({
    contributionId: v.id("communityContributions"),
    // Anonymized when the reporter deletes their account; the report stays
    // attached to another author's contribution and moderation history.
    reporterMemberId: v.optional(v.id("members")),
    reportedRevision: v.number(),
    reason: v.string(),
    status: reportStatus,
    createdAt: v.number(),
  })
    .index("by_contribution_id_and_reporter_member_id_and_reported_revision", [
      "contributionId",
      "reporterMemberId",
      "reportedRevision",
    ])
    .index("by_status", ["status"])
    .index("by_reporter_member_id", ["reporterMemberId"]),

  communityModeration: defineTable({
    reportId: v.id("communityReports"),
    contributionId: v.id("communityContributions"),
    moderatorMemberId: v.optional(v.id("members")),
    reviewedRevision: v.number(),
    action: moderationAction,
    reason: v.string(),
    createdAt: v.number(),
  })
    .index("by_report_id", ["reportId"])
    .index("by_contribution_id", ["contributionId"])
    .index("by_moderator_member_id", ["moderatorMemberId"]),

  communityRestorations: defineTable({
    reportId: v.id("communityReports"),
    contributionId: v.id("communityContributions"),
    moderatorMemberId: v.optional(v.id("members")),
    reviewedRevision: v.number(),
    requestId: v.string(),
    reason: v.string(),
    createdAt: v.number(),
  })
    .index("by_report_id", ["reportId"])
    .index("by_report_id_and_request_id", ["reportId", "requestId"])
    .index("by_contribution_id", ["contributionId"])
    .index("by_moderator_member_id", ["moderatorMemberId"]),

  communityArtworkUploadIntents: defineTable({
    authorMemberId: v.id("members"),
    contributionId: v.id("communityContributions"),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_author_member_id", ["authorMemberId"])
    .index("by_contribution_id", ["contributionId"]),

  communityImages: defineTable({
    authorMemberId: v.id("members"),
    contributionId: v.id("communityContributions"),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  })
    .index("by_author_member_id", ["authorMemberId"])
    .index("by_contribution_id", ["contributionId"])
    .index("by_storage_id", ["storageId"]),
})
