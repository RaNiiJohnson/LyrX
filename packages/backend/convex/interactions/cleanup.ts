import { v } from "convex/values"
import type { Triggers } from "convex-helpers/server/triggers"
import { internal } from "../_generated/api"
import type { DataModel, Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { changeLikeCount, type SourceId } from "./access"

const BATCH = 25
export function registerInteractionCleanup(triggers: Triggers<DataModel>) {
  for (const table of ["songs", "communityContributions"] as const) {
    triggers.register(table, async (ctx, change) => {
      if (change.operation !== "delete") return
      const sourceId = change.oldDoc._id
      const previous = await ctx.db
        .query("interactionCleanupJobs")
        .withIndex("by_source_id", (q) => q.eq("sourceId", sourceId))
        .unique()
      if (previous) return
      const jobId = await ctx.db.insert("interactionCleanupJobs", {
        sourceId,
        updatedAt: Date.now(),
      })
      await ctx.scheduler.runAfter(0, internal.interactions.cleanup.process, {
        jobId,
      })
    })
  }
}
async function cleanSource(
  ctx: MutationCtx,
  sourceId: SourceId
): Promise<boolean> {
  const likes = await ctx.db
    .query("songLikes")
    .withIndex("by_source_id", (q) => q.eq("sourceId", sourceId))
    .take(BATCH)
  if (likes.length) {
    for (const row of likes) await ctx.db.delete("songLikes", row._id)
    return true
  }
  const comment = await ctx.db
    .query("songComments")
    .withIndex("by_source_id", (q) => q.eq("sourceId", sourceId))
    .first()
  if (comment) {
    const reports = await ctx.db
      .query("commentReports")
      .withIndex("by_comment_id_and_reporter_member_id", (q) =>
        q.eq("commentId", comment._id)
      )
      .take(BATCH)
    if (reports.length)
      for (const report of reports)
        await ctx.db.delete("commentReports", report._id)
    else await ctx.db.delete("songComments", comment._id)
    return true
  }
  const count = await ctx.db
    .query("songLikeCounts")
    .withIndex("by_source_id", (q) => q.eq("sourceId", sourceId))
    .unique()
  if (count) await ctx.db.delete("songLikeCounts", count._id)
  return false
}
export const process = internalMutation({
  args: { jobId: v.id("interactionCleanupJobs") },
  returns: v.null(),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get("interactionCleanupJobs", jobId)
    if (!job) return null
    if (!(await cleanSource(ctx, job.sourceId))) {
      await ctx.db.delete("interactionCleanupJobs", jobId)
      return null
    }
    await ctx.db.patch("interactionCleanupJobs", jobId, {
      updatedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.interactions.cleanup.process, {
      jobId,
    })
    return null
  },
})
export const recover = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const jobs = await ctx.db
      .query("interactionCleanupJobs")
      .withIndex("by_updated_at", (q) =>
        q.lte("updatedAt", Date.now() - 5 * 60_000)
      )
      .take(BATCH)
    for (const job of jobs) {
      await ctx.db.patch("interactionCleanupJobs", job._id, {
        updatedAt: Date.now(),
      })
      await ctx.scheduler.runAfter(0, internal.interactions.cleanup.process, {
        jobId: job._id,
      })
    }
    return null
  },
})
/** Guard account deletion's final phase, including jobs created by older code. */
export async function cleanMemberInteractions(
  ctx: MutationCtx,
  memberId: Id<"members">
): Promise<boolean> {
  const likes = await ctx.db
    .query("songLikes")
    .withIndex("by_member_id_and_source_id", (q) => q.eq("memberId", memberId))
    .take(BATCH)
  if (likes.length) {
    for (const row of likes) {
      await ctx.db.delete("songLikes", row._id)
      await changeLikeCount(ctx, row.sourceId, -1)
    }
    return true
  }
  const comments = await ctx.db
    .query("songComments")
    .withIndex("by_author_member_id_and_request_id", (q) =>
      q.eq("authorMemberId", memberId)
    )
    .take(BATCH)
  if (comments.length) {
    for (const row of comments)
      await ctx.db.patch("songComments", row._id, {
        authorMemberId: undefined,
        requestId: "",
        body: "",
        status: "deleted",
      })
    return true
  }
  const reports = await ctx.db
    .query("commentReports")
    .withIndex("by_reporter_member_id", (q) =>
      q.eq("reporterMemberId", memberId)
    )
    .take(BATCH)
  if (reports.length) {
    for (const row of reports)
      await ctx.db.patch("commentReports", row._id, {
        reporterMemberId: undefined,
        reason: "Reporter account deleted.",
      })
    return true
  }
  const decisions = await ctx.db
    .query("commentReports")
    .withIndex("by_moderator_member_id", (q) =>
      q.eq("moderatorMemberId", memberId)
    )
    .take(BATCH)
  if (decisions.length) {
    for (const row of decisions)
      await ctx.db.patch("commentReports", row._id, {
        moderatorMemberId: undefined,
      })
    return true
  }
  return false
}
