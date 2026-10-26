import { v } from "convex/values"
import { fanMutation } from "../lib/functions"
import { contributionInput } from "./model"
import { boundedText, fail, limiter, validatedContribution } from "./values"

export const publish = fanMutation({
  args: { ...contributionInput, requestId: v.string() },
  returns: v.id("communityContributions"),
  handler: async (ctx, args) => {
    const input = validatedContribution(args)
    const requestId = boundedText(args.requestId, 100, "Request identifier")
    const existing = await ctx.db
      .query("communityContributions")
      .withIndex("by_author_member_id_and_request_id", (q) =>
        q.eq("authorMemberId", ctx.member._id).eq("requestId", requestId)
      )
      .unique()
    if (existing) return existing._id
    await limiter.limit(ctx, "communityPublish", {
      key: ctx.member._id,
      throws: true,
    })
    const now = Date.now()
    return ctx.db.insert("communityContributions", {
      ...input,
      authorMemberId: ctx.member._id,
      requestId,
      status: "published",
      revision: 1,
      firstPublishedAt: now,
      updatedAt: now,
    })
  },
})

export const update = fanMutation({
  args: {
    ...contributionInput,
    contributionId: v.id("communityContributions"),
    expectedRevision: v.number(),
    clearGenre: v.optional(v.boolean()),
    clearReleaseDate: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("communityContributions", args.contributionId)
    if (!row || row.authorMemberId !== ctx.member._id)
      fail("NOT_FOUND", "Contribution not found.")
    if (row.status !== "published")
      fail(
        "CONTRIBUTION_MODERATED",
        "A moderated contribution cannot be edited or republished."
      )
    if (row.revision !== args.expectedRevision)
      fail(
        "REVISION_CONFLICT",
        "The contribution changed. Reload before saving."
      )
    const input = validatedContribution(args, row, {
      genre: args.clearGenre,
      releaseDate: args.clearReleaseDate,
    })
    await limiter.limit(ctx, "communityEdit", {
      key: ctx.member._id,
      throws: true,
    })
    await ctx.db.patch("communityContributions", row._id, {
      ...input,
      albumTitle: input.albumTitle,
      ...(args.clearGenre ? { genre: undefined, otherGenre: undefined } : {}),
      revision: row.revision + 1,
      updatedAt: Date.now(),
    })
    return null
  },
})
