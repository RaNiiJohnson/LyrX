import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter"
import { v } from "convex/values"
import { components, internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { storageIsClaimed } from "../catalogue/artwork"
import { isValidCatalogueImageMetadata } from "../lib/catalogueImages"
import { fanMutation } from "../lib/functions"
import { fail } from "./values"

const IMAGE_TTL_MS = 10 * MINUTE
const limiter = new RateLimiter(components.rateLimiter, {
  communityArtworkUpload: {
    kind: "fixed window",
    rate: 5,
    period: IMAGE_TTL_MS,
  },
})

async function ownedPublished(
  ctx: MutationCtx,
  memberId: Id<"members">,
  contributionId: Id<"communityContributions">
) {
  const row = await ctx.db.get("communityContributions", contributionId)
  if (!row || row.authorMemberId !== memberId)
    fail("NOT_FOUND", "Contribution not found.")
  if (row.status !== "published")
    fail("CONTRIBUTION_MODERATED", "A moderated contribution cannot be edited.")
  return row
}

export const generateArtworkUploadUrl = fanMutation({
  args: { contributionId: v.id("communityContributions") },
  returns: v.object({
    uploadUrl: v.string(),
    intentId: v.id("communityArtworkUploadIntents"),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    await ownedPublished(ctx, ctx.member._id, args.contributionId)
    await limiter.limit(ctx, "communityArtworkUpload", {
      key: ctx.member._id,
      throws: true,
    })
    const now = Date.now(),
      expiresAt = now + IMAGE_TTL_MS
    const intentId = await ctx.db.insert("communityArtworkUploadIntents", {
      authorMemberId: ctx.member._id,
      contributionId: args.contributionId,
      createdAt: now,
      expiresAt,
    })
    await ctx.scheduler.runAt(
      expiresAt,
      internal.community.artwork.expireArtworkUploadIntent,
      { intentId }
    )
    return {
      uploadUrl: await ctx.storage.generateUploadUrl(),
      intentId,
      expiresAt,
    }
  },
})

export const saveArtwork = fanMutation({
  args: {
    contributionId: v.id("communityContributions"),
    intentId: v.id("communityArtworkUploadIntents"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ownedPublished(ctx, ctx.member._id, args.contributionId)
    const intent = await ctx.db.get(
      "communityArtworkUploadIntents",
      args.intentId
    )
    if (!intent && row.artworkStorageId === args.storageId) {
      const claim = await ctx.db
        .query("communityImages")
        .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
        .unique()
      if (
        claim?.authorMemberId === ctx.member._id &&
        claim.contributionId === row._id
      )
        return null
    }
    if (
      !intent ||
      intent.authorMemberId !== ctx.member._id ||
      intent.contributionId !== row._id ||
      intent.expiresAt <= Date.now()
    )
      fail(
        "INVALID_UPLOAD_INTENT",
        "This upload authorization is invalid or expired."
      )
    if (await storageIsClaimed(ctx, args.storageId))
      fail(
        "IMAGE_ALREADY_ATTACHED",
        "This image is already reserved or attached."
      )
    const metadata = await ctx.db.system.get("_storage", args.storageId)
    if (
      !metadata ||
      !isValidCatalogueImageMetadata(metadata, intent.createdAt) ||
      metadata._creationTime > intent.expiresAt
    )
      fail(
        "INVALID_IMAGE",
        "The image must be JPEG, PNG or WebP and no larger than 10 MB."
      )
    const now = Date.now()
    await ctx.db.insert("communityImages", {
      authorMemberId: ctx.member._id,
      contributionId: row._id,
      storageId: args.storageId,
      createdAt: now,
    })
    await ctx.db.patch("communityContributions", row._id, {
      artworkStorageId: args.storageId,
      revision: row.revision + 1,
      updatedAt: now,
    })
    await ctx.db.delete("communityArtworkUploadIntents", intent._id)
    if (row.artworkStorageId) {
      const oldClaim = await ctx.db
        .query("communityImages")
        .withIndex("by_storage_id", (q) =>
          q.eq("storageId", row.artworkStorageId!)
        )
        .unique()
      if (
        oldClaim?.authorMemberId === ctx.member._id &&
        oldClaim.contributionId === row._id
      ) {
        await ctx.db.delete("communityImages", oldClaim._id)
        if (!(await storageIsClaimed(ctx, row.artworkStorageId)))
          await ctx.storage.delete(row.artworkStorageId)
      }
    }
    return null
  },
})

export const expireArtworkUploadIntent = internalMutation({
  args: { intentId: v.id("communityArtworkUploadIntents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(
      "communityArtworkUploadIntents",
      args.intentId
    )
    if (intent && intent.expiresAt <= Date.now())
      await ctx.db.delete("communityArtworkUploadIntents", intent._id)
    return null
  },
})
