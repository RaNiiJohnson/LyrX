import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server"
import { v } from "convex/values"
import schema from "../schema"
import { adminQuery, adminMutation } from "../lib/functions"
import { boundedText, fail, validatePageSize } from "../community/values"
import { decision, reportStatus, songCard } from "./model"
import { publicSource } from "./access"

export const listReports = adminQuery({
  args: { status: reportStatus, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc("commentReports")),
  handler: (ctx, args) => {
    validatePageSize(args.paginationOpts)
    return ctx.db
      .query("commentReports")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .paginate(args.paginationOpts)
  },
})
export const getReport = adminQuery({
  args: { reportId: v.id("commentReports") },
  returns: v.object({
    report: schema.doc("commentReports"),
    comment: v.union(v.null(), schema.doc("songComments")),
    source: v.union(v.null(), songCard),
  }),
  handler: async (ctx, args) => {
    const report = await ctx.db.get("commentReports", args.reportId)
    if (!report) fail("NOT_FOUND", "Report not found.")
    const comment = await ctx.db.get("songComments", report.commentId)
    return {
      report,
      comment,
      source: comment ? await publicSource(ctx, comment.sourceId) : null,
    }
  },
})
export const resolve = adminMutation({
  args: {
    reportId: v.id("commentReports"),
    action: decision,
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db.get("commentReports", args.reportId)
    if (!report) fail("NOT_FOUND", "Report not found.")
    const reason = boundedText(args.reason, 1000, "Moderation reason")
    if (report.status === "resolved") {
      if (report.action === args.action && report.decisionReason === reason)
        return null
      fail("REPORT_RESOLVED", "This report has already been resolved.")
    }
    const row = await ctx.db.get("songComments", report.commentId)
    if (args.action === "remove" && row?.status === "public")
      await ctx.db.patch("songComments", row._id, {
        body: "",
        status: "removed",
      })
    await ctx.db.patch("commentReports", report._id, {
      status: "resolved",
      action: args.action,
      decisionReason: reason,
      moderatorMemberId: ctx.member._id,
      resolvedAt: Date.now(),
    })
    return null
  },
})
