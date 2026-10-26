import aggregateTest from "@convex-dev/aggregate/test"
import { convexTest } from "convex-test"
import { describe, expect, it, vi } from "vitest"

import { api, internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"
import { beginAccountDeletion } from "./deletion"

const modules = {
  "../_generated/server.ts": () => import("../_generated/server"),
  "../accounts/deletion.ts": () => import("./deletion"),
  "../community/read.ts": () => import("../community/read"),
  "../discovery/maintenance.ts": () => import("../discovery/maintenance"),
}

function backend() {
  const t = convexTest(schema, modules)
  for (const name of [
    "catalogueSongs",
    "catalogueSongsByStatus",
    "catalogueAlbums",
    "catalogueAlbumsByStatus",
    "catalogueAlbumTracks",
    "publicDiscovery",
  ])
    aggregateTest.register(t, name)
  return t
}

async function member(t: ReturnType<typeof backend>, name: string) {
  return t.run(async (ctx) => {
    const memberId = await ctx.db.insert("members", {
      authUserId: `issuer|${name}`,
      email: `${name}@example.com`,
      emailVerified: true,
      role: "fan",
      status: "active",
      isAdmin: false,
      createdAt: 1,
      updatedAt: 1,
    })
    await ctx.db.insert("profiles", {
      memberId,
      handle: name,
      handleNormalized: name,
      displayName: name,
      createdAt: 1,
      updatedAt: 1,
    })
    return memberId
  })
}

async function contribution(
  t: ReturnType<typeof backend>,
  authorMemberId: Id<"members">,
  requestId: string,
  status: "published" | "hidden" | "removed" = "published"
) {
  return t.run((ctx) =>
    ctx.db.insert("communityContributions", {
      authorMemberId,
      requestId,
      title: `Community ${requestId}`,
      primaryArtist: "Credited artist",
      lyricsText: "Original community lyrics",
      status,
      revision: 1,
      firstPublishedAt: 1,
      updatedAt: 1,
    })
  )
}

async function reportAndDecision(
  t: ReturnType<typeof backend>,
  contributionId: Id<"communityContributions">,
  reporterMemberId: Id<"members">,
  moderatorMemberId: Id<"members">,
  revision = 1
) {
  return t.run(async (ctx) => {
    const reportId = await ctx.db.insert("communityReports", {
      contributionId,
      reporterMemberId,
      reportedRevision: revision,
      reason: "Private reporter text",
      status: "resolved",
      createdAt: revision,
    })
    const decisionId = await ctx.db.insert("communityModeration", {
      reportId,
      contributionId,
      moderatorMemberId,
      reviewedRevision: revision,
      action: "hide",
      reason: "Recorded moderation reason",
      createdAt: revision,
    })
    return { reportId, decisionId }
  })
}

async function jobFor(t: ReturnType<typeof backend>, memberId: Id<"members">) {
  const job = await t.run((ctx) =>
    ctx.db
      .query("accountDeletionJobs")
      .withIndex("by_member_id", (q) => q.eq("memberId", memberId))
      .unique()
  )
  if (!job) throw new Error("Expected a pending deletion job")
  return job
}

async function drain(
  t: ReturnType<typeof backend>,
  jobId: Id<"accountDeletionJobs">
) {
  for (let step = 0; step < 200; step++) {
    if (!(await t.run((ctx) => ctx.db.get("accountDeletionJobs", jobId))))
      return step
    await t.mutation(internal.accounts.deletion.processBatch, { jobId })
  }
  throw new Error("Community deletion did not finish in bounded steps")
}

describe("community account-deletion dependents", () => {
  it("cleans artwork and restoration batches while preserving foreign files and anonymized restoration history", async () => {
    vi.useFakeTimers()
    try {
      const t = backend()
      const owner = await member(t, "artwork-owner")
      const other = await member(t, "artwork-other")
      const owned = await contribution(t, owner, "owned-artwork")
      const foreign = await contribution(t, other, "foreign-artwork")
      const ownAudit = await reportAndDecision(t, owned, other, other)
      const foreignAudit = await reportAndDecision(t, foreign, other, other)
      const storageIds = await t.run(async (ctx) => {
        const ids: Array<Id<"_storage">> = []
        for (let n = 0; n < 27; n++) {
          const storageId = await ctx.storage.store(new Blob([`image-${n}`]))
          ids.push(storageId)
          await ctx.db.insert("communityImages", {
            authorMemberId: owner,
            contributionId: owned,
            storageId,
            createdAt: n,
          })
          await ctx.db.insert("communityArtworkUploadIntents", {
            authorMemberId: owner,
            contributionId: owned,
            createdAt: n,
            expiresAt: Date.now() + 600_000,
          })
          for (const [contributionId, reportId, moderatorMemberId] of [
            [owned, ownAudit.reportId, other],
            [foreign, foreignAudit.reportId, owner],
          ] as const)
            await ctx.db.insert("communityRestorations", {
              contributionId,
              reportId,
              moderatorMemberId,
              requestId: `restore-${n}`,
              reason: "Recorded restoration reason",
              reviewedRevision: n + 1,
              createdAt: n,
            })
        }
        await ctx.db.patch("communityContributions", owned, {
          artworkStorageId: ids[1],
        })
        // Unexpected foreign references must preserve bytes, not delete them.
        await ctx.db.patch("communityContributions", foreign, {
          artworkStorageId: ids[0],
        })
        return ids
      })
      const foreignIntent = await t.run((ctx) =>
        ctx.db.insert("communityArtworkUploadIntents", {
          authorMemberId: other,
          contributionId: foreign,
          createdAt: 1,
          expiresAt: Date.now() + 600_000,
        })
      )
      await t.run((ctx) => beginAccountDeletion(ctx, "issuer|artwork-owner"))
      const job = await jobFor(t, owner)
      for (let step = 0; step < 20; step++) {
        if ((await jobFor(t, owner)).phase === "member") break
        await t.mutation(internal.accounts.deletion.processBatch, {
          jobId: job._id,
        })
      }
      await t.mutation(internal.accounts.deletion.processBatch, {
        jobId: job._id,
      })
      expect(
        await t.run((ctx) =>
          ctx.db
            .query("communityRestorations")
            .withIndex("by_contribution_id", (q) =>
              q.eq("contributionId", owned)
            )
            .take(30)
        )
      ).toHaveLength(2)
      await drain(t, job._id)
      await t.run(async (ctx) => {
        expect(await ctx.db.get("communityContributions", owned)).toBeNull()
        expect(await ctx.db.get("members", owner)).toBeNull()
        expect(
          await ctx.db.get("communityContributions", foreign)
        ).toMatchObject({
          status: "published",
          authorMemberId: other,
          artworkStorageId: storageIds[0],
        })
        expect(
          await ctx.db.get("communityArtworkUploadIntents", foreignIntent)
        ).not.toBeNull()
        expect(
          await ctx.db
            .query("communityArtworkUploadIntents")
            .withIndex("by_author_member_id", (q) =>
              q.eq("authorMemberId", owner)
            )
            .take(30)
        ).toEqual([])
        expect(await ctx.db.query("communityImages").take(30)).toEqual([])
        const restorations = await ctx.db
          .query("communityRestorations")
          .take(60)
        expect(restorations).toHaveLength(27)
        for (const row of restorations) {
          expect(row).not.toHaveProperty("moderatorMemberId")
          expect(row).toMatchObject({
            contributionId: foreign,
            reason: "Recorded restoration reason",
          })
        }
        const preservedStorage = storageIds[0]
        if (!preservedStorage) throw new Error("Missing preserved test image")
        expect(
          await ctx.db.system.get("_storage", preservedStorage)
        ).not.toBeNull()
        for (const id of storageIds.slice(1))
          expect(await ctx.db.system.get("_storage", id)).toBeNull()
      })
      await t.finishAllScheduledFunctions(() => vi.runAllTimers())
    } finally {
      vi.useRealTimers()
    }
  })

  it("withdraws immediately and deletes more than one batch of owned publications and their reports/decisions without touching another author", async () => {
    vi.useFakeTimers()
    try {
      const t = backend()
      const owner = await member(t, "community-owner")
      const other = await member(t, "community-other")
      const first = await contribution(t, owner, "first")
      for (let index = 0; index < 26; index++)
        await contribution(
          t,
          owner,
          `owned-${index}`,
          index % 2 ? "hidden" : "removed"
        )
      for (let index = 0; index < 51; index++)
        await reportAndDecision(t, first, other, other, index + 1)
      const preserved = await contribution(t, other, "preserved", "hidden")
      const retained = await reportAndDecision(t, preserved, other, other)
      const snapshots = await t.run(async (ctx) => ({
        contribution: await ctx.db.get("communityContributions", preserved),
        report: await ctx.db.get("communityReports", retained.reportId),
        decision: await ctx.db.get("communityModeration", retained.decisionId),
      }))
      expect(
        await t.query(api.community.read.getPublished, {
          contributionId: first,
        })
      ).not.toBeNull()

      await t.run((ctx) => beginAccountDeletion(ctx, "issuer|community-owner"))
      await t.run((ctx) => beginAccountDeletion(ctx, "issuer|community-owner"))
      expect(
        await t.query(api.community.read.getPublished, {
          contributionId: first,
        })
      ).toBeNull()
      expect(
        (
          await t.query(api.community.read.listPublished, {
            paginationOpts: { numItems: 50, cursor: null },
          })
        ).page
      ).toEqual([])
      const job = await jobFor(t, owner)
      for (let step = 0; step < 20; step++) {
        if ((await jobFor(t, owner)).phase === "member") break
        await t.mutation(internal.accounts.deletion.processBatch, {
          jobId: job._id,
        })
      }
      expect((await jobFor(t, owner)).phase).toBe("member")
      await t.mutation(internal.accounts.deletion.processBatch, {
        jobId: job._id,
      })
      await t.run(async (ctx) => {
        expect(
          await ctx.db
            .query("communityModeration")
            .withIndex("by_contribution_id", (q) =>
              q.eq("contributionId", first)
            )
            .take(60)
        ).toHaveLength(26)
        expect(
          await ctx.db
            .query("communityReports")
            .withIndex(
              "by_contribution_id_and_reporter_member_id_and_reported_revision",
              (q) => q.eq("contributionId", first)
            )
            .take(60)
        ).toHaveLength(51)
        expect(await ctx.db.get("members", owner)).not.toBeNull()
        expect(await ctx.db.get("communityContributions", first)).not.toBeNull()
      })
      expect(await drain(t, job._id)).toBeGreaterThan(25)
      await t.run(async (ctx) => {
        expect(await ctx.db.get("members", owner)).toBeNull()
        expect(await ctx.db.get("members", other)).toMatchObject({
          status: "active",
        })
        expect(await ctx.db.query("communityContributions").take(60)).toEqual([
          snapshots.contribution,
        ])
        expect(await ctx.db.query("communityReports").take(60)).toEqual([
          snapshots.report,
        ])
        expect(await ctx.db.query("communityModeration").take(60)).toEqual([
          snapshots.decision,
        ])
      })
      await expect(
        t.mutation(internal.accounts.deletion.processBatch, {
          jobId: job._id,
        })
      ).resolves.toBeNull()
      await t.finishAllScheduledFunctions(() => vi.runAllTimers())
    } finally {
      vi.useRealTimers()
    }
  })

  it("anonymizes deleted reporter/moderator references in bounded batches without erasing another author's moderation", async () => {
    vi.useFakeTimers()
    try {
      const t = backend()
      const deleted = await member(t, "deleted-moderator")
      const author = await member(t, "retained-author")
      const hidden = await contribution(t, author, "moderated", "hidden")
      for (let index = 0; index < 27; index++)
        await reportAndDecision(t, hidden, deleted, deleted, index + 1)
      const untouched = await reportAndDecision(t, hidden, author, author, 28)
      const snapshot = await t.run(async (ctx) => ({
        report: await ctx.db.get("communityReports", untouched.reportId),
        decision: await ctx.db.get("communityModeration", untouched.decisionId),
      }))
      await t.run((ctx) =>
        beginAccountDeletion(ctx, "issuer|deleted-moderator")
      )
      const job = await jobFor(t, deleted)
      for (let step = 0; step < 20; step++) {
        if ((await jobFor(t, deleted)).phase === "member") break
        await t.mutation(internal.accounts.deletion.processBatch, {
          jobId: job._id,
        })
      }
      await t.mutation(internal.accounts.deletion.processBatch, {
        jobId: job._id,
      })
      expect(
        await t.run((ctx) =>
          ctx.db
            .query("communityReports")
            .withIndex("by_reporter_member_id", (q) =>
              q.eq("reporterMemberId", deleted)
            )
            .take(30)
        )
      ).toHaveLength(2)
      await drain(t, job._id)
      await t.run(async (ctx) => {
        const reports = await ctx.db.query("communityReports").take(30)
        const decisions = await ctx.db.query("communityModeration").take(30)
        expect(reports).toHaveLength(28)
        expect(decisions).toHaveLength(28)
        for (const report of reports.filter(
          (r) => r._id !== untouched.reportId
        )) {
          expect(report).not.toHaveProperty("reporterMemberId")
          expect(report).toMatchObject({
            reason: "Reporter account deleted.",
            status: "resolved",
            contributionId: hidden,
          })
        }
        for (const decision of decisions.filter(
          (d) => d._id !== untouched.decisionId
        )) {
          expect(decision).not.toHaveProperty("moderatorMemberId")
          expect(decision).toMatchObject({
            action: "hide",
            reason: "Recorded moderation reason",
            contributionId: hidden,
          })
          expect(
            await ctx.db.get("communityReports", decision.reportId)
          ).not.toBeNull()
        }
        expect(
          await ctx.db.get("communityReports", untouched.reportId)
        ).toEqual(snapshot.report)
        expect(
          await ctx.db.get("communityModeration", untouched.decisionId)
        ).toEqual(snapshot.decision)
        expect(
          await ctx.db.get("communityContributions", hidden)
        ).toMatchObject({
          authorMemberId: author,
          status: "hidden",
        })
        expect(await ctx.db.get("members", deleted)).toBeNull()
      })
      await t.finishAllScheduledFunctions(() => vi.runAllTimers())
    } finally {
      vi.useRealTimers()
    }
  })

  it("recovers an older job already in its final member phase and safely repeats callbacks", async () => {
    vi.useFakeTimers()
    try {
      const t = backend()
      const owner = await member(t, "stalled-fan")
      const other = await member(t, "stalled-other")
      const owned = await contribution(t, owner, "stalled")
      const dependent = await reportAndDecision(t, owned, other, other)
      await t.run(async (ctx) => {
        await beginAccountDeletion(ctx, "issuer|stalled-fan")
        const job = await ctx.db.query("accountDeletionJobs").first()
        if (!job) throw new Error("Expected deletion job")
        await ctx.db.patch("accountDeletionJobs", job._id, {
          phase: "member",
          updatedAt: 0,
        })
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_member_id", (q) => q.eq("memberId", owner))
          .unique()
        if (profile) await ctx.db.delete("profiles", profile._id)
        for (const callback of await ctx.db.system
          .query("_scheduled_functions")
          .take(10))
          await ctx.scheduler.cancel(callback._id)
      })
      const job = await jobFor(t, owner)
      await t.mutation(internal.accounts.deletion.resumeStalledJobs, {})
      await t.finishAllScheduledFunctions(() => vi.runAllTimers())
      await t.run(async (ctx) => {
        expect(await ctx.db.get("members", owner)).toBeNull()
        expect(await ctx.db.get("members", other)).not.toBeNull()
        expect(await ctx.db.get("communityContributions", owned)).toBeNull()
        expect(
          await ctx.db.get("communityReports", dependent.reportId)
        ).toBeNull()
        expect(
          await ctx.db.get("communityModeration", dependent.decisionId)
        ).toBeNull()
        expect(await ctx.db.get("accountDeletionJobs", job._id)).toBeNull()
        expect(await ctx.db.query("accountDeletions").take(2)).toMatchObject([
          { authUserId: "issuer|stalled-fan" },
        ])
      })
      await expect(
        t.mutation(internal.accounts.deletion.processBatch, {
          jobId: job._id,
        })
      ).resolves.toBeNull()
      await t.run((ctx) => beginAccountDeletion(ctx, "issuer|stalled-fan"))
      expect(
        await t.run((ctx) => ctx.db.query("accountDeletionJobs").take(1))
      ).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })
})
