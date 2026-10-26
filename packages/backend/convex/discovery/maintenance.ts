import { v } from "convex/values"
import { internal } from "../_generated/api"
import type { Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import {
  changeViews,
  syncAlbum,
  syncArtist,
  syncContribution,
  syncSong,
} from "./projection"

const BATCH = 10
async function finish(ctx: MutationCtx, job: Doc<"discoveryJobs">) {
  const state = await ctx.db
    .query("discoveryState")
    .withIndex("by_key", (q) => q.eq("key", "public"))
    .unique()
  if (!state) throw new Error("Discovery maintenance state is missing.")
  await ctx.db.patch("discoveryState", state._id, {
    pendingJobs: Math.max(0, state.pendingJobs - 1),
    initialized: job.memberId ? state.initialized : true,
  })
  await ctx.db.delete("discoveryJobs", job._id)
}

/** Internal deployment migration: bounded, restartable, safe to invoke again. */
export const backfill = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("discoveryJobs")
      .withIndex("by_member_id", (q) => q.eq("memberId", undefined))
      .unique()
    if (existing) {
      await ctx.scheduler.runAfter(
        0,
        internal.discovery.maintenance.processJob,
        { jobId: existing._id }
      )
      return null
    }
    const state = await ctx.db
      .query("discoveryState")
      .withIndex("by_key", (q) => q.eq("key", "public"))
      .unique()
    if (state)
      await ctx.db.patch("discoveryState", state._id, {
        initialized: false,
        pendingJobs: state.pendingJobs + 1,
      })
    else
      await ctx.db.insert("discoveryState", {
        key: "public",
        initialized: false,
        pendingJobs: 1,
      })
    const jobId = await ctx.db.insert("discoveryJobs", {
      phase: "songs",
      cursor: null,
      updatedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.discovery.maintenance.processJob, {
      jobId,
    })
    return null
  },
})

export const processJob = internalMutation({
  args: { jobId: v.id("discoveryJobs") },
  returns: v.null(),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get("discoveryJobs", jobId)
    if (!job) return null
    const pagination = { cursor: job.cursor, numItems: BATCH }
    let nextPhase: Doc<"discoveryJobs">["phase"] = job.phase
    let cursor: string | null = null
    let done = false
    if (job.phase === "songs") {
      const page = job.memberId
        ? await ctx.db
            .query("songs")
            .withIndex("by_owner_member_id", (q) =>
              q.eq("ownerMemberId", job.memberId!)
            )
            .paginate(pagination)
        : await ctx.db.query("songs").paginate(pagination)
      for (const row of page.page) await syncSong(ctx, row, row._id)
      nextPhase = page.isDone ? "community" : "songs"
      cursor = page.isDone ? null : page.continueCursor
    } else if (job.phase === "community") {
      const page = job.memberId
        ? await ctx.db
            .query("communityContributions")
            .withIndex("by_author_member_id", (q) =>
              q.eq("authorMemberId", job.memberId!)
            )
            .paginate(pagination)
        : await ctx.db.query("communityContributions").paginate(pagination)
      for (const row of page.page) await syncContribution(ctx, row, row._id)
      nextPhase = page.isDone ? "albums" : "community"
      cursor = page.isDone ? null : page.continueCursor
    } else if (job.phase === "albums") {
      const page = job.memberId
        ? await ctx.db
            .query("albums")
            .withIndex("by_owner_member_id", (q) =>
              q.eq("ownerMemberId", job.memberId!)
            )
            .paginate(pagination)
        : await ctx.db.query("albums").paginate(pagination)
      for (const row of page.page) await syncAlbum(ctx, row, row._id)
      nextPhase = page.isDone ? "artists" : "albums"
      cursor = page.isDone ? null : page.continueCursor
    } else if (job.memberId) {
      await syncArtist(ctx, job.memberId)
      done = true
    } else {
      const page = await ctx.db.query("members").paginate(pagination)
      for (const row of page.page) await syncArtist(ctx, row._id)
      done = page.isDone
      cursor = page.isDone ? null : page.continueCursor
    }
    if (done) await finish(ctx, job)
    else {
      await ctx.db.patch("discoveryJobs", jobId, {
        phase: nextPhase,
        cursor,
        updatedAt: Date.now(),
      })
      await ctx.scheduler.runAfter(
        0,
        internal.discovery.maintenance.processJob,
        { jobId }
      )
    }
    return null
  },
})

/** Expiration is materialized by mutations; queries never read the wall clock. */
export const expireViews = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("discoveryViews")
      .withIndex("by_expires_at", (q) => q.lte("expiresAt", Date.now()))
      .take(25)
    for (const view of expired) {
      await changeViews(ctx, view.sourceId, -1)
      await ctx.db.delete("discoveryViews", view._id)
    }
    if (expired.length === 25)
      await ctx.scheduler.runAfter(
        0,
        internal.discovery.maintenance.expireViews,
        {}
      )
    return null
  },
})

export const recover = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const jobs = await ctx.db
      .query("discoveryJobs")
      .withIndex("by_updated_at", (q) =>
        q.lte("updatedAt", Date.now() - 60_000)
      )
      .take(10)
    for (const job of jobs) {
      await ctx.db.patch("discoveryJobs", job._id, { updatedAt: Date.now() })
      await ctx.scheduler.runAfter(
        0,
        internal.discovery.maintenance.processJob,
        { jobId: job._id }
      )
    }
    await ctx.scheduler.runAfter(
      0,
      internal.discovery.maintenance.expireViews,
      {}
    )
    const cleanups = await ctx.db.query("discoveryViewCleanup").take(10)
    for (const cleanup of cleanups) await ctx.scheduler.runAfter(0, internal.discovery.maintenance.cleanSourceViews, { sourceId: cleanup.sourceId })
    return null
  },
})

export const cleanSourceViews = internalMutation({
  args: { sourceId: v.union(v.id("songs"), v.id("communityContributions")) }, returns: v.null(),
  handler: async (ctx, { sourceId }) => {
    const cleanup = await ctx.db.query("discoveryViewCleanup").withIndex("by_source_id", (q) => q.eq("sourceId", sourceId)).unique()
    if (!cleanup) return null
    const views = await ctx.db.query("discoveryViews").withIndex("by_source_id", (q) => q.eq("sourceId", sourceId)).take(25)
    for (const view of views) await ctx.db.delete("discoveryViews", view._id)
    if (views.length === 25) await ctx.scheduler.runAfter(0, internal.discovery.maintenance.cleanSourceViews, { sourceId })
    else await ctx.db.delete("discoveryViewCleanup", cleanup._id)
    return null
  },
})
