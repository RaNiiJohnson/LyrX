import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server"
import { v } from "convex/values"
import { adminMutation, adminQuery, memberMutation } from "../lib/functions"
import schema from "../schema"
import { moderationAction, reportStatus } from "./model"
import {
  boundedText,
  fail,
  limiter,
  publicSummary,
  validatePageSize,
} from "./values"

export const report = memberMutation({
  args: { contributionId: v.id("communityContributions"), reason: v.string() },
  returns: v.id("communityReports"),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("communityContributions", args.contributionId)
    if (!row || !(await publicSummary(ctx, row)))
      fail("NOT_FOUND", "Public contribution not found.")
    const reason = boundedText(args.reason, 1000, "Report reason")
    const previous = await ctx.db
      .query("communityReports")
      .withIndex(
        "by_contribution_id_and_reporter_member_id_and_reported_revision",
        (q) =>
          q
            .eq("contributionId", row._id)
            .eq("reporterMemberId", ctx.member._id)
            .eq("reportedRevision", row.revision)
      )
      .unique()
    if (previous) return previous._id
    await limiter.limit(ctx, "communityReport", {
      key: ctx.member._id,
      throws: true,
    })
    return ctx.db.insert("communityReports", {
      contributionId: row._id,
      reporterMemberId: ctx.member._id,
      reportedRevision: row.revision,
      reason,
      status: "open",
      createdAt: Date.now(),
    })
  },
})

export const listReports = adminQuery({
  args: { status: reportStatus, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc("communityReports")),
  handler: (ctx, args) => {
    validatePageSize(args.paginationOpts)
    return ctx.db
      .query("communityReports")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .paginate(args.paginationOpts)
  },
})

export const getReport = adminQuery({
  args: { reportId: v.id("communityReports") },
  returns: v.object({
    report: schema.doc("communityReports"),
    contribution: schema.doc("communityContributions"),
    decision: v.union(v.null(), schema.doc("communityModeration")),
  }),
  handler: async (ctx, args) => {
    const record = await ctx.db.get("communityReports", args.reportId)
    if (!record) fail("NOT_FOUND", "Report not found.")
    const contribution = await ctx.db.get(
      "communityContributions",
      record.contributionId
    )
    if (!contribution) fail("NOT_FOUND", "Reported contribution not found.")
    const decision = await ctx.db
      .query("communityModeration")
      .withIndex("by_report_id", (q) => q.eq("reportId", record._id))
      .unique()
    return { report: record, contribution, decision }
  },
})

export const resolve = adminMutation({
  args: {
    reportId: v.id("communityReports"),
    action: moderationAction,
    reason: v.string(),
    expectedRevision: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get("communityReports", args.reportId)
    if (!record) fail("NOT_FOUND", "Report not found.")
    const reason = boundedText(args.reason, 1000, "Moderation reason")
    if (record.status === "resolved") {
      const decision = await ctx.db
        .query("communityModeration")
        .withIndex("by_report_id", (q) => q.eq("reportId", record._id))
        .unique()
      if (decision?.action === args.action && decision.reason === reason)
        return null
      fail("REPORT_RESOLVED", "This report has already been resolved.")
    }
    const row = await ctx.db.get(
      "communityContributions",
      record.contributionId
    )
    if (!row) fail("NOT_FOUND", "Reported contribution not found.")
    if (row.revision !== args.expectedRevision)
      fail(
        "REVISION_CONFLICT",
        "The contribution changed. Reload before moderating."
      )
    const now = Date.now()
    if (
      args.action === "remove" ||
      (args.action === "hide" && row.status === "published")
    )
      await ctx.db.patch("communityContributions", row._id, {
        status: args.action === "remove" ? "removed" : "hidden",
        updatedAt: now,
      })
    await ctx.db.insert("communityModeration", {
      reportId: record._id,
      contributionId: row._id,
      moderatorMemberId: ctx.member._id,
      reviewedRevision: row.revision,
      action: args.action,
      reason,
      createdAt: now,
    })
    await ctx.db.patch("communityReports", record._id, { status: "resolved" })
    return null
  },
})
