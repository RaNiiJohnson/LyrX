import { v } from "convex/values"
import type { Triggers } from "convex-helpers/server/triggers"
import { internal } from "../_generated/api"
import type { DataModel, Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { publicSource } from "../interactions/access"

type Target = Id<"members"> | Id<"songs"> | Id<"communityContributions">
async function enqueue(ctx: MutationCtx, targetId: Target) {
  const previous = await ctx.db
    .query("notebookCleanupJobs")
    .withIndex("by_target_id", (q) => q.eq("targetId", targetId))
    .unique()
  if (previous) {
    // Restart traversal if another withdrawal occurs during cleanup.
    await ctx.db.patch("notebookCleanupJobs", previous._id, {
      cursor: null,
      updatedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.notebook.cleanup.process, {
      jobId: previous._id,
    })
    return
  }
  const jobId = await ctx.db.insert("notebookCleanupJobs", {
    targetId,
    cursor: null,
    updatedAt: Date.now(),
  })
  await ctx.scheduler.runAfter(0, internal.notebook.cleanup.process, { jobId })
}
export function registerNotebookCleanup(triggers: Triggers<DataModel>) {
  for (const table of ["songs", "communityContributions"] as const) {
    triggers.register(table, async (ctx, change) => {
      if (
        change.oldDoc?.status === "published" &&
        change.newDoc?.status !== "published"
      )
        await enqueue(ctx, change.oldDoc._id)
    })
  }
  triggers.register("members", async (ctx, change) => {
    if (
      change.oldDoc &&
      (!change.newDoc ||
        change.newDoc.status !== "active" ||
        !change.newDoc.emailVerified ||
        change.oldDoc.role !== change.newDoc.role)
    )
      await enqueue(ctx, change.oldDoc._id)
  })
}
export const process = internalMutation({
  args: { jobId: v.id("notebookCleanupJobs") },
  returns: v.null(),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get("notebookCleanupJobs", jobId)
    if (!job) return null
    const memberId = ctx.db.normalizeId("members", job.targetId)
    const query = memberId
      ? ctx.db
          .query("notebookPassages")
          .withIndex("by_source_owner_id", (q) =>
            q.eq("sourceOwnerId", memberId)
          )
      : ctx.db
          .query("notebookPassages")
          .withIndex("by_source_id", (q) =>
            q.eq(
              "sourceId",
              job.targetId as Id<"songs"> | Id<"communityContributions">
            )
          )
    const page = await query.paginate({ numItems: 25, cursor: job.cursor })
    for (const row of page.page) {
      if (row.snapshot && !(await publicSource(ctx, row.sourceId)))
        await ctx.db.patch("notebookPassages", row._id, { snapshot: undefined })
    }
    if (page.isDone) await ctx.db.delete("notebookCleanupJobs", jobId)
    else {
      await ctx.db.patch("notebookCleanupJobs", jobId, {
        cursor: page.continueCursor,
        updatedAt: Date.now(),
      })
      await ctx.scheduler.runAfter(0, internal.notebook.cleanup.process, {
        jobId,
      })
    }
    return null
  },
})
export const recover = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const jobs = await ctx.db
      .query("notebookCleanupJobs")
      .withIndex("by_updated_at", (q) =>
        q.lte("updatedAt", Date.now() - 5 * 60_000)
      )
      .take(25)
    for (const job of jobs) {
      await ctx.db.patch("notebookCleanupJobs", job._id, {
        updatedAt: Date.now(),
      })
      await ctx.scheduler.runAfter(0, internal.notebook.cleanup.process, {
        jobId: job._id,
      })
    }
    return null
  },
})
export async function cleanMemberNotebook(
  ctx: MutationCtx,
  memberId: Id<"members">
) {
  const passages = await ctx.db
    .query("notebookPassages")
    .withIndex("by_member_id", (q) => q.eq("memberId", memberId))
    .take(25)
  if (passages.length) {
    for (const row of passages) await ctx.db.delete("notebookPassages", row._id)
    return true
  }
  const collections = await ctx.db
    .query("notebookCollections")
    .withIndex("by_member_id", (q) => q.eq("memberId", memberId))
    .take(25)
  for (const row of collections)
    await ctx.db.delete("notebookCollections", row._id)
  return collections.length > 0
}
