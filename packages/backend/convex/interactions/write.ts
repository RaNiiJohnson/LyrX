import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter"
import { v } from "convex/values"
import { components } from "../_generated/api"
import { memberMutation } from "../lib/functions"
import { boundedText, fail } from "../community/values"
import { eligibleMember } from "../discovery/projection"
import { sourceId, reportCategory } from "./model"
import { changeLikeCount, requirePublicSource } from "./access"

const limiter = new RateLimiter(components.rateLimiter, {
  songLike: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 10 },
  songComment: { kind: "token bucket", rate: 30, period: HOUR, capacity: 5 },
  commentReport: { kind: "token bucket", rate: 10, period: HOUR, capacity: 3 },
})
/** Set desired state, never toggle: duplicate requests cannot undo each other. */
export const setLike = memberMutation({
  args: { sourceId, liked: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const previous = await ctx.db
      .query("songLikes")
      .withIndex("by_member_id_and_source_id", (q) =>
        q.eq("memberId", ctx.member._id).eq("sourceId", args.sourceId)
      )
      .unique()
    // Removal remains available when a source has been withdrawn.
    if (!args.liked) {
      if (previous) {
        await ctx.db.delete("songLikes", previous._id)
        await changeLikeCount(ctx, args.sourceId, -1)
      }
      return null
    }
    await requirePublicSource(ctx, args.sourceId)
    if (previous) return null
    await limiter.limit(ctx, "songLike", { key: ctx.member._id, throws: true })
    await ctx.db.insert("songLikes", {
      sourceId: args.sourceId,
      memberId: ctx.member._id,
    })
    await changeLikeCount(ctx, args.sourceId, 1)
    return null
  },
})
export const addComment = memberMutation({
  args: { sourceId, body: v.string(), requestId: v.string() },
  returns: v.id("songComments"),
  handler: async (ctx, args) => {
    await requirePublicSource(ctx, args.sourceId)
    const body = boundedText(args.body, 500, "Comment")
    const requestId = boundedText(args.requestId, 100, "Request identifier")
    const previous = await ctx.db
      .query("songComments")
      .withIndex("by_author_member_id_and_request_id", (q) =>
        q.eq("authorMemberId", ctx.member._id).eq("requestId", requestId)
      )
      .unique()
    if (previous) {
      if (
        previous.sourceId !== args.sourceId ||
        (previous.status === "public" && previous.body !== body)
      )
        fail("INVALID_INPUT", "Request identifier is already in use.")
      return previous._id
    }
    await limiter.limit(ctx, "songComment", {
      key: ctx.member._id,
      throws: true,
    })
    return ctx.db.insert("songComments", {
      sourceId: args.sourceId,
      authorMemberId: ctx.member._id,
      requestId,
      body,
      status: "public",
    })
  },
})
export const deleteComment = memberMutation({
  args: { commentId: v.id("songComments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("songComments", args.commentId)
    if (!row || row.authorMemberId !== ctx.member._id)
      fail("FORBIDDEN", "Only the author can delete this comment.")
    if (row.status !== "deleted")
      await ctx.db.patch("songComments", row._id, {
        body: "",
        status: "deleted",
      })
    return null
  },
})
export const reportComment = memberMutation({
  args: {
    commentId: v.id("songComments"),
    reason: v.string(),
    category: v.optional(reportCategory),
  },
  returns: v.id("commentReports"),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("songComments", args.commentId)
    if (
      !row ||
      row.status !== "public" ||
      !row.authorMemberId ||
      !(await eligibleMember(ctx, row.authorMemberId))
    )
      fail("NOT_FOUND", "Public comment not found.")
    await requirePublicSource(ctx, row.sourceId)
    if (row.authorMemberId === ctx.member._id)
      fail("SELF_REPORT_FORBIDDEN", "You cannot report your own comment.")
    const reason = args.category
      ? args.reason.trim()
      : boundedText(args.reason, 1000, "Report reason")
    if (reason.length > 1000)
      fail("INVALID_INPUT", "Report details must not exceed 1000 characters.")
    const previous = await ctx.db
      .query("commentReports")
      .withIndex("by_comment_id_and_reporter_member_id", (q) =>
        q.eq("commentId", row._id).eq("reporterMemberId", ctx.member._id)
      )
      .unique()
    if (previous) return previous._id
    await limiter.limit(ctx, "commentReport", {
      key: ctx.member._id,
      throws: true,
    })
    return ctx.db.insert("commentReports", {
      commentId: row._id,
      reporterMemberId: ctx.member._id,
      reason,
      ...(args.category ? { category: args.category } : {}),
      status: "open",
    })
  },
})
