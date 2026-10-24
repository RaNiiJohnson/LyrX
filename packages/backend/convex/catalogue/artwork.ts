import { type Infer, v } from "convex/values"
import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter"
import { components, internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { artistMutation } from "../lib/functions"
import { isValidCatalogueImageMetadata } from "../lib/catalogueImages"
import { bad } from "./values"
import { ownedSong, ownedAlbum } from "./access"
import { patchInheritedSongs } from "./tracks"

const STORAGE_SWEEP_BATCH = 100

const STORAGE_SWEEP_KEY = "unclaimed-storage-v1"

const IMAGE_TTL_MS = 10 * MINUTE

const uploadLimiter = new RateLimiter(components.rateLimiter, {
  catalogueArtworkUpload: {
    kind: "fixed window",
    rate: 5,
    period: IMAGE_TTL_MS,
  },
})

const resourceInput = v.union(
  v.object({ kind: v.literal("song"), id: v.id("songs") }),
  v.object({ kind: v.literal("album"), id: v.id("albums") })
)

async function assertResourceOwner(
  ctx: MutationCtx,
  memberId: Id<"members">,
  resource: Infer<typeof resourceInput>
) {
  if (resource.kind === "song") return ownedSong(ctx, memberId, resource.id)
  return ownedAlbum(ctx, memberId, resource.id)
}

export const generateArtworkUploadUrl = artistMutation({
  args: { resource: resourceInput },
  returns: v.object({
    uploadUrl: v.string(),
    intentId: v.id("catalogueImageUploadIntents"),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    await assertResourceOwner(ctx, ctx.member._id, args.resource)
    await uploadLimiter.limit(ctx, "catalogueArtworkUpload", {
      key: ctx.member._id,
      throws: true,
    })
    const now = Date.now(),
      expiresAt = now + IMAGE_TTL_MS
    const intentId = await ctx.db.insert("catalogueImageUploadIntents", {
      ownerMemberId: ctx.member._id,
      kind: args.resource.kind,
      resourceId: args.resource.id,
      createdAt: now,
      expiresAt,
    })
    await ctx.scheduler.runAt(
      expiresAt,
      internal.catalogue.artwork.expireArtworkUploadIntent,
      { intentId }
    )
    return {
      uploadUrl: await ctx.storage.generateUploadUrl(),
      intentId,
      expiresAt,
    }
  },
})

export const registerArtworkUpload = artistMutation({
  args: {
    resource: resourceInput,
    intentId: v.id("catalogueImageUploadIntents"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertResourceOwner(ctx, ctx.member._id, args.resource)
    const intent = await ctx.db.get(
      "catalogueImageUploadIntents",
      args.intentId
    )
    if (
      !intent ||
      intent.ownerMemberId !== ctx.member._id ||
      intent.kind !== args.resource.kind ||
      intent.resourceId !== args.resource.id ||
      intent.expiresAt < Date.now() ||
      intent.storageId !== undefined
    )
      bad(
        "INVALID_UPLOAD_INTENT",
        "This upload authorization is invalid or expired."
      )
    const reservedIntent = await ctx.db
      .query("catalogueImageUploadIntents")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first()
    const claimedImage = await ctx.db
      .query("catalogueImages")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first()
    if (reservedIntent || claimedImage)
      bad("IMAGE_ALREADY_ATTACHED", "This image is already reserved.")
    const metadata = await ctx.db.system.get("_storage", args.storageId)
    if (!metadata || !isValidCatalogueImageMetadata(metadata, intent.createdAt))
      bad(
        "INVALID_IMAGE",
        "The image must be JPEG, PNG or WebP and no larger than 10 MB."
      )
    await ctx.db.patch("catalogueImageUploadIntents", intent._id, {
      storageId: args.storageId,
    })
    return null
  },
})

export async function deleteArtworkIfUnused(
  ctx: MutationCtx,
  memberId: Id<"members">,
  storageId: Id<"_storage">
) {
  const owner = await ctx.db
    .query("catalogueImages")
    .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
    .unique()
  if (!owner || owner.ownerMemberId !== memberId) return
  const song = await ctx.db
    .query("songs")
    .withIndex("by_artwork_storage_id", (q) =>
      q.eq("artworkStorageId", storageId)
    )
    .first()
  const album = await ctx.db
    .query("albums")
    .withIndex("by_artwork_storage_id", (q) =>
      q.eq("artworkStorageId", storageId)
    )
    .unique()
  if (!song && !album) {
    await ctx.db.delete("catalogueImages", owner._id)
    await ctx.storage.delete(storageId)
  }
}

export const saveArtwork = artistMutation({
  args: {
    resource: resourceInput,
    intentId: v.id("catalogueImageUploadIntents"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const resource = await assertResourceOwner(
      ctx,
      ctx.member._id,
      args.resource
    )
    const intent = await ctx.db.get(
      "catalogueImageUploadIntents",
      args.intentId
    )
    if (
      !intent ||
      intent.ownerMemberId !== ctx.member._id ||
      intent.kind !== args.resource.kind ||
      intent.resourceId !== args.resource.id ||
      intent.expiresAt < Date.now() ||
      intent.storageId !== args.storageId
    )
      bad(
        "INVALID_UPLOAD_INTENT",
        "This upload authorization is invalid or expired."
      )
    const existingOwner = await ctx.db
      .query("catalogueImages")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique()
    if (
      existingOwner &&
      (existingOwner.ownerMemberId !== ctx.member._id ||
        existingOwner.kind !== args.resource.kind)
    ) {
      bad("FORBIDDEN", "This image belongs to another resource.")
    }
    if (existingOwner && resource.artworkStorageId !== args.storageId) {
      bad("IMAGE_ALREADY_ATTACHED", "This image is already attached.")
    }
    if (!existingOwner)
      await ctx.db.insert("catalogueImages", {
        ownerMemberId: ctx.member._id,
        storageId: args.storageId,
        kind: args.resource.kind,
        createdAt: Date.now(),
      })
    const previous = resource.artworkStorageId
    if (args.resource.kind === "song") {
      const songId = args.resource.id
      await ctx.db.patch("songs", songId, {
        artworkStorageId: args.storageId,
        status: "draft",
        rightsConfirmedAt: undefined,
        updatedAt: Date.now(),
      })
      const track = await ctx.db
        .query("albumTracks")
        .withIndex("by_song_id", (q) => q.eq("songId", songId))
        .unique()
      if (track)
        await ctx.db.patch("albumTracks", track._id, {
          inheritArtwork: false,
          updatedAt: Date.now(),
        })
    } else {
      await ctx.db.patch("albums", args.resource.id, {
        artworkStorageId: args.storageId,
        status: "draft",
        rightsConfirmedAt: undefined,
        updatedAt: Date.now(),
      })
      const album = await ownedAlbum(ctx, ctx.member._id, args.resource.id)
      await patchInheritedSongs(ctx, album)
    }
    await ctx.db.delete("catalogueImageUploadIntents", intent._id)
    if (previous && previous !== args.storageId)
      await deleteArtworkIfUnused(ctx, ctx.member._id, previous)
    return null
  },
})

export const expireArtworkUploadIntent = internalMutation({
  args: { intentId: v.id("catalogueImageUploadIntents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(
      "catalogueImageUploadIntents",
      args.intentId
    )
    if (intent && intent.expiresAt <= Date.now()) {
      if (
        intent.storageId &&
        !(await storageIsClaimed(ctx, intent.storageId, intent._id))
      )
        await ctx.storage.delete(intent.storageId)
      await ctx.db.delete("catalogueImageUploadIntents", intent._id)
    }
    return null
  },
})

async function storageIsClaimed(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  ignoredIntentId?: Id<"catalogueImageUploadIntents">
) {
  // This is the single exhaustive claim registry for the global storage sweep.
  // Any new table that persists a StorageId must be added here before release.
  const [catalogueImage, profileImage, song, album, profile, artistProfile] =
    await Promise.all([
      ctx.db
        .query("catalogueImages")
        .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
        .first(),
      ctx.db
        .query("profileImages")
        .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
        .first(),
      ctx.db
        .query("songs")
        .withIndex("by_artwork_storage_id", (q) =>
          q.eq("artworkStorageId", storageId)
        )
        .first(),
      ctx.db
        .query("albums")
        .withIndex("by_artwork_storage_id", (q) =>
          q.eq("artworkStorageId", storageId)
        )
        .first(),
      ctx.db
        .query("profiles")
        .withIndex("by_avatar_storage_id", (q) =>
          q.eq("avatarStorageId", storageId)
        )
        .first(),
      ctx.db
        .query("artistProfiles")
        .withIndex("by_banner_storage_id", (q) =>
          q.eq("bannerStorageId", storageId)
        )
        .first(),
    ])
  if (
    catalogueImage ||
    profileImage ||
    song ||
    album ||
    profile ||
    artistProfile
  )
    return true
  const registeredIntent = await ctx.db
    .query("catalogueImageUploadIntents")
    .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
    .first()
  return Boolean(registeredIntent && registeredIntent._id !== ignoredIntentId)
}

async function sweepUnclaimedStoragePage(ctx: MutationCtx) {
  const state = await ctx.db
    .query("storageCleanupCursors")
    .withIndex("by_key", (q) => q.eq("key", STORAGE_SWEEP_KEY))
    .unique()
  const page = await ctx.db.system.query("_storage").paginate({
    cursor: state?.cursor ?? null,
    numItems: STORAGE_SWEEP_BATCH,
  })
  const cutoff = Date.now() - IMAGE_TTL_MS
  for (const metadata of page.page) {
    if (
      metadata._creationTime <= cutoff &&
      !(await storageIsClaimed(ctx, metadata._id))
    )
      await ctx.storage.delete(metadata._id)
  }
  const cursor = page.isDone ? null : page.continueCursor
  if (state)
    await ctx.db.patch("storageCleanupCursors", state._id, {
      cursor,
      updatedAt: Date.now(),
    })
  else
    await ctx.db.insert("storageCleanupCursors", {
      key: STORAGE_SWEEP_KEY,
      cursor,
      updatedAt: Date.now(),
    })
  return page.isDone
}

async function runStorageSweep(ctx: MutationCtx) {
  if (!(await sweepUnclaimedStoragePage(ctx)))
    await ctx.scheduler.runAfter(
      0,
      internal.catalogue.artwork.sweepUnclaimedStorage,
      {}
    )
}

export const sweepUnclaimedStorage = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await runStorageSweep(ctx)
    return null
  },
})
