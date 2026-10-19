import { ConvexError, v } from "convex/values"

import schema from "./schema"
import { accountRoleValidator, customLinkValidator } from "./model"
import { query } from "./_generated/server"
import { memberMutation, verifiedMutation } from "./lib/functions"
import { findMemberByIdentity } from "./lib/authz"
import {
  normalizeEmail,
  normalizeHandle,
  validateCustomLinks,
  validateDisplayName,
  validateHandle,
  validateOptionalText,
  validateProfileImageMetadata,
  validateSocialUrl,
} from "./lib/validation"

const artistInputValidator = v.object({
  presentation: v.optional(v.string()),
  instagramUrl: v.optional(v.string()),
  facebookUrl: v.optional(v.string()),
  tiktokUrl: v.optional(v.string()),
  youtubeUrl: v.optional(v.string()),
  spotifyUrl: v.optional(v.string()),
  customLinks: v.array(customLinkValidator),
})

const publicProfileValidator = v.object({
  handle: v.string(),
  displayName: v.string(),
  bio: v.optional(v.string()),
  avatarUrl: v.union(v.string(), v.null()),
  role: accountRoleValidator,
  artist: v.union(
    v.object({
      presentation: v.optional(v.string()),
      instagramUrl: v.optional(v.string()),
      facebookUrl: v.optional(v.string()),
      tiktokUrl: v.optional(v.string()),
      youtubeUrl: v.optional(v.string()),
      spotifyUrl: v.optional(v.string()),
      customLinks: v.array(customLinkValidator),
      bannerUrl: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
})

const profileImageKindValidator = v.union(
  v.literal("avatar"),
  v.literal("banner")
)

export const current = query({
  args: {},
  returns: v.union(
    v.object({ state: v.literal("anonymous") }),
    v.object({
      state: v.literal("email-unverified"),
      email: v.optional(v.string()),
    }),
    v.object({ state: v.literal("onboarding-required") }),
    v.object({ state: v.literal("suspended") }),
    v.object({
      state: v.literal("ready"),
      member: schema.doc("members"),
      profile: schema.doc("profiles"),
      artistProfile: v.union(schema.doc("artistProfiles"), v.null()),
    })
  ),
  handler: async (ctx) => {
    const result = await findMemberByIdentity(ctx)
    if (!result) return { state: "anonymous" as const }
    if (
      result.identity.emailVerified !== true ||
      typeof result.identity.email !== "string"
    ) {
      return {
        state: "email-unverified" as const,
        ...(typeof result.identity.email === "string"
          ? { email: result.identity.email }
          : {}),
      }
    }
    if (!result.member) return { state: "onboarding-required" as const }
    if (result.member.status === "suspended") {
      return { state: "suspended" as const }
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_member_id", (q) => q.eq("memberId", result.member!._id))
      .unique()
    if (!profile) {
      throw new ConvexError({
        code: "PROFILE_INVARIANT_BROKEN",
        message: "Le profil associé au compte est introuvable.",
      })
    }
    const artistProfile =
      result.member.role === "artist"
        ? await ctx.db
            .query("artistProfiles")
            .withIndex("by_member_id", (q) =>
              q.eq("memberId", result.member!._id)
            )
            .unique()
        : null

    return {
      state: "ready" as const,
      member: result.member,
      profile,
      artistProfile,
    }
  },
})

export const completeOnboarding = verifiedMutation({
  args: {
    role: accountRoleValidator,
    handle: v.string(),
    displayName: v.string(),
    bio: v.optional(v.string()),
    artist: v.optional(artistInputValidator),
  },
  returns: v.object({
    memberId: v.id("members"),
    handle: v.string(),
  }),
  handler: async (ctx, args) => {
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_auth_user_id", (q) =>
        q.eq("authUserId", ctx.identity.tokenIdentifier)
      )
      .unique()
    if (existingMember) {
      throw new ConvexError({
        code: "ONBOARDING_ALREADY_COMPLETED",
        message: "L’onboarding de ce compte est déjà terminé.",
      })
    }

    const handleNormalized = validateHandle(args.handle)
    const handleTaken = await ctx.db
      .query("profiles")
      .withIndex("by_handle_normalized", (q) =>
        q.eq("handleNormalized", handleNormalized)
      )
      .unique()
    if (handleTaken) {
      throw new ConvexError({
        code: "HANDLE_TAKEN",
        message: "Ce pseudo est déjà utilisé.",
      })
    }

    const now = Date.now()
    const memberId = await ctx.db.insert("members", {
      authUserId: ctx.identity.tokenIdentifier,
      email: normalizeEmail(ctx.identity.email),
      emailVerified: true,
      role: args.role,
      status: "active",
      isAdmin: false,
      createdAt: now,
      updatedAt: now,
    })
    const bio = validateOptionalText(args.bio, 500, "La bio")
    await ctx.db.insert("profiles", {
      memberId,
      handle: handleNormalized,
      handleNormalized,
      displayName: validateDisplayName(args.displayName),
      ...(bio ? { bio } : {}),
      createdAt: now,
      updatedAt: now,
    })

    if (args.role === "artist") {
      await ctx.db.insert("artistProfiles", {
        memberId,
        ...validatedArtistInput(args.artist),
        createdAt: now,
        updatedAt: now,
      })
    }

    return { memberId, handle: handleNormalized }
  },
})

export const updateMyProfile = memberMutation({
  args: {
    handle: v.string(),
    displayName: v.string(),
    bio: v.optional(v.string()),
    artist: v.optional(artistInputValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_member_id", (q) => q.eq("memberId", ctx.member._id))
      .unique()
    if (!profile) {
      throw new ConvexError({
        code: "PROFILE_INVARIANT_BROKEN",
        message: "Le profil associé au compte est introuvable.",
      })
    }

    const handleNormalized = validateHandle(args.handle)
    const handleOwner = await ctx.db
      .query("profiles")
      .withIndex("by_handle_normalized", (q) =>
        q.eq("handleNormalized", handleNormalized)
      )
      .unique()
    if (handleOwner && handleOwner._id !== profile._id) {
      throw new ConvexError({
        code: "HANDLE_TAKEN",
        message: "Ce pseudo est déjà utilisé.",
      })
    }

    const now = Date.now()
    const bio = validateOptionalText(args.bio, 500, "La bio")
    await ctx.db.replace("profiles", profile._id, {
      memberId: profile.memberId,
      handle: handleNormalized,
      handleNormalized,
      displayName: validateDisplayName(args.displayName),
      ...(bio ? { bio } : {}),
      ...(profile.avatarStorageId
        ? { avatarStorageId: profile.avatarStorageId }
        : {}),
      createdAt: profile.createdAt,
      updatedAt: now,
    })

    if (ctx.member.role === "artist") {
      const artistProfile = await ctx.db
        .query("artistProfiles")
        .withIndex("by_member_id", (q) => q.eq("memberId", ctx.member._id))
        .unique()
      const updates = validatedArtistInput(args.artist)
      if (artistProfile) {
        await ctx.db.replace("artistProfiles", artistProfile._id, {
          memberId: artistProfile.memberId,
          ...(artistProfile.bannerStorageId
            ? { bannerStorageId: artistProfile.bannerStorageId }
            : {}),
          ...updates,
          createdAt: artistProfile.createdAt,
          updatedAt: now,
        })
      } else {
        await ctx.db.insert("artistProfiles", {
          memberId: ctx.member._id,
          ...updates,
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    return null
  },
})

export const generateProfileImageUploadUrl = memberMutation({
  args: { kind: profileImageKindValidator },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.kind === "banner" && ctx.member.role !== "artist") {
      throw new ConvexError({
        code: "ARTIST_ROLE_REQUIRED",
        message: "Seul un compte artiste peut ajouter une bannière.",
      })
    }
    return await ctx.storage.generateUploadUrl()
  },
})

export const saveProfileImage = memberMutation({
  args: {
    kind: profileImageKindValidator,
    storageId: v.id("_storage"),
  },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({ ok: v.literal(false), message: v.string() })
  ),
  handler: async (ctx, args) => {
    const metadata = await ctx.db.system.get("_storage", args.storageId)
    if (!metadata) {
      throw new ConvexError({
        code: "UPLOAD_NOT_FOUND",
        message: "Le fichier envoyé est introuvable.",
      })
    }
    if (args.kind === "banner" && ctx.member.role !== "artist") {
      await ctx.storage.delete(args.storageId)
      return {
        ok: false as const,
        message: "Seul un compte artiste peut ajouter une bannière.",
      }
    }
    const validationError = validateProfileImageMetadata(args.kind, metadata)
    if (validationError) {
      await ctx.storage.delete(args.storageId)
      return {
        ok: false as const,
        message: validationError,
      }
    }

    if (args.kind === "avatar") {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_member_id", (q) => q.eq("memberId", ctx.member._id))
        .unique()
      if (!profile) {
        await ctx.storage.delete(args.storageId)
        return {
          ok: false as const,
          message: "Le profil associé au compte est introuvable.",
        }
      }
      const previousStorageId = profile.avatarStorageId
      await ctx.db.patch("profiles", profile._id, {
        avatarStorageId: args.storageId,
        updatedAt: Date.now(),
      })
      if (previousStorageId && previousStorageId !== args.storageId) {
        await ctx.storage.delete(previousStorageId)
      }
      return { ok: true as const }
    }

    const artistProfile = await ctx.db
      .query("artistProfiles")
      .withIndex("by_member_id", (q) => q.eq("memberId", ctx.member._id))
      .unique()
    if (!artistProfile) {
      await ctx.storage.delete(args.storageId)
      return {
        ok: false as const,
        message: "Le profil artiste associé au compte est introuvable.",
      }
    }
    const previousStorageId = artistProfile.bannerStorageId
    await ctx.db.patch("artistProfiles", artistProfile._id, {
      bannerStorageId: args.storageId,
      updatedAt: Date.now(),
    })
    if (previousStorageId && previousStorageId !== args.storageId) {
      await ctx.storage.delete(previousStorageId)
    }
    return { ok: true as const }
  },
})

export const publicByHandle = query({
  args: { handle: v.string() },
  returns: v.union(publicProfileValidator, v.null()),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_handle_normalized", (q) =>
        q.eq("handleNormalized", normalizeHandle(args.handle))
      )
      .unique()
    if (!profile) return null

    const member = await ctx.db.get("members", profile.memberId)
    if (!member || member.status !== "active") return null

    const artistProfile =
      member.role === "artist"
        ? await ctx.db
            .query("artistProfiles")
            .withIndex("by_member_id", (q) => q.eq("memberId", member._id))
            .unique()
        : null

    const bio = profile.bio
    return {
      handle: profile.handle,
      displayName: profile.displayName,
      ...(bio ? { bio } : {}),
      avatarUrl: profile.avatarStorageId
        ? await ctx.storage.getUrl(profile.avatarStorageId)
        : null,
      role: member.role,
      artist: artistProfile
        ? {
            ...(artistProfile.presentation
              ? { presentation: artistProfile.presentation }
              : {}),
            ...(artistProfile.instagramUrl
              ? { instagramUrl: artistProfile.instagramUrl }
              : {}),
            ...(artistProfile.facebookUrl
              ? { facebookUrl: artistProfile.facebookUrl }
              : {}),
            ...(artistProfile.tiktokUrl
              ? { tiktokUrl: artistProfile.tiktokUrl }
              : {}),
            ...(artistProfile.youtubeUrl
              ? { youtubeUrl: artistProfile.youtubeUrl }
              : {}),
            ...(artistProfile.spotifyUrl
              ? { spotifyUrl: artistProfile.spotifyUrl }
              : {}),
            customLinks: artistProfile.customLinks,
            bannerUrl: artistProfile.bannerStorageId
              ? await ctx.storage.getUrl(artistProfile.bannerStorageId)
              : null,
          }
        : null,
    }
  },
})

function validatedArtistInput(
  input:
    | {
        presentation?: string
        instagramUrl?: string
        facebookUrl?: string
        tiktokUrl?: string
        youtubeUrl?: string
        spotifyUrl?: string
        customLinks: Array<{ label: string; url: string }>
      }
    | undefined
) {
  const presentation = validateOptionalText(
    input?.presentation,
    2_000,
    "La présentation"
  )
  const instagramUrl = validateSocialUrl("instagramUrl", input?.instagramUrl)
  const facebookUrl = validateSocialUrl("facebookUrl", input?.facebookUrl)
  const tiktokUrl = validateSocialUrl("tiktokUrl", input?.tiktokUrl)
  const youtubeUrl = validateSocialUrl("youtubeUrl", input?.youtubeUrl)
  const spotifyUrl = validateSocialUrl("spotifyUrl", input?.spotifyUrl)

  return {
    ...(presentation ? { presentation } : {}),
    ...(instagramUrl ? { instagramUrl } : {}),
    ...(facebookUrl ? { facebookUrl } : {}),
    ...(tiktokUrl ? { tiktokUrl } : {}),
    ...(youtubeUrl ? { youtubeUrl } : {}),
    ...(spotifyUrl ? { spotifyUrl } : {}),
    customLinks: validateCustomLinks(input?.customLinks ?? []),
  }
}
