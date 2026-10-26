import { v } from "convex/values"

import { internal } from "../_generated/api"
import type { Doc, Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { catalogueAggregateTriggers } from "../catalogue/aggregates"
import { storageIsClaimed } from "../catalogue/artwork"
import { changeViews } from "../discovery/projection"

const BATCH_SIZE = 25
const STALLED_AFTER_MS = 5 * 60_000
type Phase = Doc<"accountDeletionJobs">["phase"]

/** Called only by the authoritative Better Auth user-deletion trigger. */
export async function beginAccountDeletion(
  rawCtx: MutationCtx,
  authUserId: string
): Promise<void> {
  const ctx = catalogueAggregateTriggers.wrapDB(rawCtx)
  const tombstone = await ctx.db
    .query("accountDeletions")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
    .unique()
  if (!tombstone)
    await ctx.db.insert("accountDeletions", {
      authUserId,
      requestedAt: Date.now(),
    })

  const member = await ctx.db
    .query("members")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
    .unique()
  if (!member) return

  // Public projections already exclude suspended owners. Hide immediately,
  // before any physical cleanup, and prevent writes while batches are running.
  await ctx.db.patch("members", member._id, {
    status: "suspended",
    updatedAt: Date.now(),
  })
  const existing = await ctx.db
    .query("accountDeletionJobs")
    .withIndex("by_member_id", (q) => q.eq("memberId", member._id))
    .unique()
  if (existing) return
  const jobId = await ctx.db.insert("accountDeletionJobs", {
    memberId: member._id,
    phase: "songs",
    updatedAt: Date.now(),
  })
  await ctx.scheduler.runAfter(0, internal.accounts.deletion.processBatch, {
    jobId,
  })
}

async function removeUnclaimedFile(
  ctx: MutationCtx,
  storageId: Id<"_storage">
) {
  // Delete the owned claim first, then consult every other claim. An unexpected
  // cross-account reference preserves the file, not an orphaned ownership row.
  if (!(await storageIsClaimed(ctx, storageId)))
    await ctx.storage.delete(storageId)
}

/** Remove only owned publications; preserve anonymized history on other works. */
async function cleanCommunityBatch(ctx: MutationCtx, owner: Id<"members">) {
  const views = await ctx.db
    .query("discoveryViews")
    .withIndex("by_viewer_member_id", (q) => q.eq("viewerMemberId", owner))
    .take(BATCH_SIZE)
  if (views.length) {
    for (const view of views) {
      await changeViews(ctx, view.sourceId, -1)
      await ctx.db.delete("discoveryViews", view._id)
    }
    return true
  }
  const contribution = await ctx.db
    .query("communityContributions")
    .withIndex("by_author_member_id", (q) => q.eq("authorMemberId", owner))
    .first()
  if (contribution) {
    const restorations = await ctx.db
      .query("communityRestorations")
      .withIndex("by_contribution_id", (q) =>
        q.eq("contributionId", contribution._id)
      )
      .take(BATCH_SIZE)
    if (restorations.length) {
      for (const restoration of restorations)
        await ctx.db.delete("communityRestorations", restoration._id)
      return true
    }
    const decisions = await ctx.db
      .query("communityModeration")
      .withIndex("by_contribution_id", (q) =>
        q.eq("contributionId", contribution._id)
      )
      .take(BATCH_SIZE)
    if (decisions.length) {
      for (const decision of decisions)
        await ctx.db.delete("communityModeration", decision._id)
      return true
    }
    const reports = await ctx.db
      .query("communityReports")
      .withIndex(
        "by_contribution_id_and_reporter_member_id_and_reported_revision",
        (q) => q.eq("contributionId", contribution._id)
      )
      .take(BATCH_SIZE)
    if (reports.length) {
      for (const report of reports)
        await ctx.db.delete("communityReports", report._id)
      return true
    }
    await ctx.db.delete("communityContributions", contribution._id)
    return true
  }

  const intents = await ctx.db
    .query("communityArtworkUploadIntents")
    .withIndex("by_author_member_id", (q) => q.eq("authorMemberId", owner))
    .take(BATCH_SIZE)
  if (intents.length) {
    for (const intent of intents)
      await ctx.db.delete("communityArtworkUploadIntents", intent._id)
    return true
  }
  const images = await ctx.db
    .query("communityImages")
    .withIndex("by_author_member_id", (q) => q.eq("authorMemberId", owner))
    .take(BATCH_SIZE)
  if (images.length) {
    for (const image of images) {
      await ctx.db.delete("communityImages", image._id)
      await removeUnclaimedFile(ctx, image.storageId)
    }
    return true
  }

  const reports = await ctx.db
    .query("communityReports")
    .withIndex("by_reporter_member_id", (q) => q.eq("reporterMemberId", owner))
    .take(BATCH_SIZE)
  if (reports.length) {
    for (const report of reports)
      await ctx.db.patch("communityReports", report._id, {
        reporterMemberId: undefined,
        reason: "Reporter account deleted.",
      })
    return true
  }
  const decisions = await ctx.db
    .query("communityModeration")
    .withIndex("by_moderator_member_id", (q) =>
      q.eq("moderatorMemberId", owner)
    )
    .take(BATCH_SIZE)
  if (decisions.length) {
    for (const decision of decisions)
      await ctx.db.patch("communityModeration", decision._id, {
        moderatorMemberId: undefined,
      })
    return true
  }
  const restorations = await ctx.db
    .query("communityRestorations")
    .withIndex("by_moderator_member_id", (q) =>
      q.eq("moderatorMemberId", owner)
    )
    .take(BATCH_SIZE)
  if (restorations.length) {
    for (const restoration of restorations)
      await ctx.db.patch("communityRestorations", restoration._id, {
        moderatorMemberId: undefined,
      })
    return true
  }
  return false
}

async function advance(ctx: MutationCtx, job: Doc<"accountDeletionJobs">) {
  const owner = job.memberId
  if (job.phase === "songs") {
    const song = await ctx.db
      .query("songs")
      .withIndex("by_owner_member_id", (q) => q.eq("ownerMemberId", owner))
      .first()
    if (!song) return "tracks"
    const lines = await ctx.db
      .query("lyricLines")
      .withIndex("by_song_id", (q) => q.eq("songId", song._id))
      .take(BATCH_SIZE)
    if (lines.length) {
      for (const line of lines) await ctx.db.delete("lyricLines", line._id)
      return "songs"
    }
    const sections = await ctx.db
      .query("songSections")
      .withIndex("by_song_id_and_position", (q) => q.eq("songId", song._id))
      .take(BATCH_SIZE)
    if (sections.length) {
      for (const section of sections)
        await ctx.db.delete("songSections", section._id)
      return "songs"
    }
    await ctx.db.delete("songs", song._id)
    return "songs"
  }
  if (job.phase === "tracks") {
    const tracks = await ctx.db
      .query("albumTracks")
      .withIndex("by_owner_member_id", (q) => q.eq("ownerMemberId", owner))
      .take(BATCH_SIZE)
    for (const track of tracks) await ctx.db.delete("albumTracks", track._id)
    return tracks.length ? "tracks" : "albums"
  }
  if (job.phase === "albums") {
    const albums = await ctx.db
      .query("albums")
      .withIndex("by_owner_member_id", (q) => q.eq("ownerMemberId", owner))
      .take(BATCH_SIZE)
    for (const album of albums) await ctx.db.delete("albums", album._id)
    return albums.length ? "albums" : "profiles"
  }
  if (job.phase === "profiles") {
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_member_id", (q) => q.eq("memberId", owner))
      .take(BATCH_SIZE)
    for (const profile of profiles) await ctx.db.delete("profiles", profile._id)
    return profiles.length ? "profiles" : "artistProfiles"
  }
  if (job.phase === "artistProfiles") {
    const profiles = await ctx.db
      .query("artistProfiles")
      .withIndex("by_member_id", (q) => q.eq("memberId", owner))
      .take(BATCH_SIZE)
    for (const profile of profiles)
      await ctx.db.delete("artistProfiles", profile._id)
    return profiles.length ? "artistProfiles" : "profileIntents"
  }
  if (job.phase === "profileIntents") {
    const intents = await ctx.db
      .query("profileImageUploadIntents")
      .withIndex("by_member_id", (q) => q.eq("memberId", owner))
      .take(BATCH_SIZE)
    for (const intent of intents)
      await ctx.db.delete("profileImageUploadIntents", intent._id)
    return intents.length ? "profileIntents" : "catalogueIntents"
  }
  if (job.phase === "catalogueIntents") {
    const intents = await ctx.db
      .query("catalogueImageUploadIntents")
      .withIndex("by_owner_member_id", (q) => q.eq("ownerMemberId", owner))
      .take(BATCH_SIZE)
    for (const intent of intents) {
      await ctx.db.delete("catalogueImageUploadIntents", intent._id)
      if (intent.storageId) await removeUnclaimedFile(ctx, intent.storageId)
    }
    return intents.length ? "catalogueIntents" : "profileImages"
  }
  if (job.phase === "profileImages") {
    const images = await ctx.db
      .query("profileImages")
      .withIndex("by_member_id_and_kind", (q) => q.eq("memberId", owner))
      .take(BATCH_SIZE)
    for (const image of images) {
      await ctx.db.delete("profileImages", image._id)
      await removeUnclaimedFile(ctx, image.storageId)
    }
    return images.length ? "profileImages" : "catalogueImages"
  }
  if (job.phase === "catalogueImages") {
    const images = await ctx.db
      .query("catalogueImages")
      .withIndex("by_owner_member_id_and_kind", (q) =>
        q.eq("ownerMemberId", owner)
      )
      .take(BATCH_SIZE)
    for (const image of images) {
      await ctx.db.delete("catalogueImages", image._id)
      await removeUnclaimedFile(ctx, image.storageId)
    }
    return images.length ? "catalogueImages" : "member"
  }
  // Keep this guard at the final phase, so jobs created by older deployments
  // (including a stalled job already at "member") cannot skip new dependents.
  if (await cleanCommunityBatch(ctx, owner)) return "member"
  if (await ctx.db.get("members", owner)) await ctx.db.delete("members", owner)
  return null
}

export const processBatch = internalMutation({
  args: { jobId: v.id("accountDeletionJobs") },
  returns: v.null(),
  handler: async (rawCtx, { jobId }) => {
    const ctx = catalogueAggregateTriggers.wrapDB(rawCtx)
    const job = await ctx.db.get("accountDeletionJobs", jobId)
    if (!job) return null
    const phase: Phase | null = await advance(ctx, job)
    if (phase === null) {
      await ctx.db.delete("accountDeletionJobs", jobId)
      return null
    }
    await ctx.db.patch("accountDeletionJobs", jobId, {
      phase,
      updatedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.accounts.deletion.processBatch, {
      jobId,
    })
    return null
  },
})

// A failed scheduled mutation leaves its durable job untouched. Periodically
// resume stalled work; duplicate scheduled callbacks are safe and transactional.
export const resumeStalledJobs = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const jobs = await ctx.db
      .query("accountDeletionJobs")
      .withIndex("by_updated_at", (q) =>
        q.lte("updatedAt", Date.now() - STALLED_AFTER_MS)
      )
      .take(BATCH_SIZE)
    for (const job of jobs) {
      await ctx.db.patch("accountDeletionJobs", job._id, {
        updatedAt: Date.now(),
      })
      await ctx.scheduler.runAfter(0, internal.accounts.deletion.processBatch, {
        jobId: job._id,
      })
    }
    return null
  },
})
