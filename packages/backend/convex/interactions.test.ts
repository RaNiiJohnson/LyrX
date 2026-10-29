/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { describe, it, expect } from "vitest"
import aggregateTest from "@convex-dev/aggregate/test"
import rateLimiterTest from "@convex-dev/rate-limiter/test"
import schema from "./schema"
import { api, internal } from "./_generated/api"
import { beginAccountDeletion } from "./accounts/deletion"
import { catalogueAggregateTriggers } from "./catalogue/aggregates"
import { cleanMemberInteractions } from "./interactions/cleanup"

const modules = import.meta.glob("./**/*.ts")
function backend() {
  const t = convexTest(schema, modules)
  rateLimiterTest.register(t)
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
async function setup() {
  const t = backend()
  async function member(
    name: string,
    role: "artist" | "fan" = "fan",
    admin = false
  ) {
    const identity = {
      tokenIdentifier: `https://issuer.example|${name}`,
      subject: name,
      issuer: "https://issuer.example",
      email: `${name}@example.com`,
      emailVerified: true,
    }
    const id = await t.run(async (ctx) => {
      const memberId = await ctx.db.insert("members", {
        authUserId: identity.tokenIdentifier,
        email: identity.email,
        emailVerified: true,
        role,
        status: "active",
        isAdmin: admin,
        createdAt: 0,
        updatedAt: 0,
      })
      await ctx.db.insert("profiles", {
        memberId,
        handle: name,
        handleNormalized: name,
        displayName: name,
        createdAt: 0,
        updatedAt: 0,
      })
      return memberId
    })
    return { id, client: t.withIdentity(identity), identity }
  }
  const artist = await member("artist", "artist"),
    fan = await member("fan"),
    other = await member("other"),
    admin = await member("admin", "fan", true)
  const song = await t.run((ctx) =>
    ctx.db.insert("songs", {
      ownerMemberId: artist.id,
      title: "Original song",
      primaryArtist: "Artist",
      status: "published",
      guestArtists: [],
      writers: [],
      composers: [],
      producers: [],
      listeningLinks: [],
      lyricsText: "Original technical lyrics",
      createdAt: 0,
      updatedAt: 0,
      firstPublishedAt: 0,
    })
  )
  const community = await t.run((ctx) =>
    ctx.db.insert("communityContributions", {
      authorMemberId: fan.id,
      title: "Fan song",
      primaryArtist: "Credited artist",
      lyricsText: "Original fan test lyrics",
      status: "published",
      requestId: "seed",
      revision: 1,
      firstPublishedAt: 0,
      updatedAt: 0,
    })
  )
  return { t, member, artist, fan, other, admin, song, community }
}
const page = { numItems: 2, cursor: null }
describe("song interactions", () => {
  it("sets likes idempotently under concurrent retries for both origins; anonymous count exposes no identities", async () => {
    const { t, fan, other, song, community } = await setup()
    await Promise.all(
      Array.from({ length: 5 }, () =>
        fan.client.mutation(api.interactions.write.setLike, {
          sourceId: song,
          liked: true,
        })
      )
    )
    await other.client.mutation(api.interactions.write.setLike, {
      sourceId: song,
      liked: true,
    })
    await fan.client.mutation(api.interactions.write.setLike, {
      sourceId: community,
      liked: true,
    })
    expect(
      await t.query(api.interactions.read.summary, { sourceId: song })
    ).toEqual({ count: 2, liked: false })
    expect(
      await fan.client.query(api.interactions.read.summary, { sourceId: song })
    ).toEqual({ count: 2, liked: true })
    expect(
      (
        await fan.client.query(api.interactions.read.likedSongs, {
          paginationOpts: page,
        })
      ).page
    ).toHaveLength(2)
    expect(
      (
        await other.client.query(api.interactions.read.likedSongs, {
          paginationOpts: page,
        })
      ).page
    ).toHaveLength(1)
    await Promise.all(
      Array.from({ length: 3 }, () =>
        fan.client.mutation(api.interactions.write.setLike, {
          sourceId: song,
          liked: false,
        })
      )
    )
    expect(
      await t.query(api.interactions.read.summary, { sourceId: song })
    ).toEqual({ count: 1, liked: false })
    await expect(
      t.query(api.interactions.read.likedSongs, { paginationOpts: page })
    ).rejects.toThrow("UNAUTHENTICATED")
  })
  it("rejects anonymous/unverified/suspended/revoked writers and forged identity arguments", async () => {
    const { t, fan, song } = await setup()
    const args = { sourceId: song, liked: true }
    await expect(
      t.mutation(api.interactions.write.setLike, args)
    ).rejects.toThrow("UNAUTHENTICATED")
    await expect(
      t
        .withIdentity({ ...fan.identity, emailVerified: false })
        .mutation(api.interactions.write.setLike, args)
    ).rejects.toThrow("EMAIL_NOT_VERIFIED")
    const forgedIdentity = { ...args, memberId: fan.id }
    await expect(
      fan.client.mutation(api.interactions.write.setLike, forgedIdentity)
    ).rejects.toThrow("memberId")
    await t.run((ctx) =>
      ctx.db.patch("members", fan.id, { status: "suspended" })
    )
    await expect(
      fan.client.mutation(api.interactions.write.setLike, args)
    ).rejects.toThrow("ACCOUNT_SUSPENDED")
    await t.run((ctx) =>
      ctx.db.insert("accountDeletions", {
        authUserId: fan.identity.tokenIdentifier,
        requestedAt: 0,
      })
    )
    await expect(
      fan.client.mutation(api.interactions.write.addComment, {
        sourceId: song,
        body: "No",
        requestId: "no",
      })
    ).rejects.toThrow("UNAUTHENTICATED")
  })
  it("does not reveal interactions or liked metadata on drafts/hidden sources or ineligible owners", async () => {
    const { t, fan, other, artist, song, community } = await setup()
    for (const sourceId of [song, community]) {
      await other.client.mutation(api.interactions.write.setLike, {
        sourceId,
        liked: true,
      })
      await other.client.mutation(api.interactions.write.addComment, {
        sourceId,
        body: "Visible",
        requestId: String(sourceId),
      })
    }
    await t.run(async (ctx) => {
      await ctx.db.patch("songs", song, { status: "draft" })
      await ctx.db.patch("communityContributions", community, {
        status: "hidden",
      })
    })
    for (const sourceId of [song, community]) {
      expect(
        await t.query(api.interactions.read.summary, { sourceId })
      ).toBeNull()
      expect(
        (
          await t.query(api.interactions.read.comments, {
            sourceId,
            paginationOpts: page,
          })
        ).page
      ).toEqual([])
      await expect(
        fan.client.mutation(api.interactions.write.setLike, {
          sourceId,
          liked: true,
        })
      ).rejects.toThrow("NOT_FOUND")
      await expect(
        fan.client.mutation(api.interactions.write.addComment, {
          sourceId,
          body: "No",
          requestId: "no",
        })
      ).rejects.toThrow("NOT_FOUND")
    }
    expect(
      (
        await other.client.query(api.interactions.read.likedSongs, {
          paginationOpts: page,
        })
      ).page
    ).toEqual([])
    await other.client.mutation(api.interactions.write.setLike, {
      sourceId: song,
      liked: false,
    })
    await t.run(async (ctx) => {
      await ctx.db.patch("songs", song, { status: "published" })
      await ctx.db.insert("accountDeletions", {
        authUserId: artist.identity.tokenIdentifier,
        requestedAt: 0,
      })
    })
    expect(
      await t.query(api.interactions.read.summary, { sourceId: song })
    ).toBeNull()
  })
  it("creates flat chronological comments once, preserves plain text and strips private fields", async () => {
    const { t, fan, artist, song, community } = await setup()
    const args = {
      sourceId: song,
      body: "  First\n<script>alert(1)</script>  ",
      requestId: "once",
    }
    const ids = await Promise.all([
      fan.client.mutation(api.interactions.write.addComment, args),
      fan.client.mutation(api.interactions.write.addComment, args),
    ])
    expect(ids[0]).toBe(ids[1])
    await artist.client.mutation(api.interactions.write.addComment, {
      sourceId: song,
      body: "Second",
      requestId: "two",
    })
    const cards = (
      await t.query(api.interactions.read.comments, {
        sourceId: song,
        paginationOpts: page,
      })
    ).page
    expect(cards.map((x) => x.body)).toEqual([
      "First\n<script>alert(1)</script>",
      "Second",
    ])
    expect(cards[0]).toMatchObject({
      author: { handle: "fan" },
      isOwn: false,
      canReport: false,
    })
    for (const key of [
      "authorMemberId",
      "requestId",
      "email",
      "reports",
      "reason",
    ])
      expect(cards[0]).not.toHaveProperty(key)
    const own = (
      await fan.client.query(api.interactions.read.comments, {
        sourceId: song,
        paginationOpts: page,
      })
    ).page
    expect(own[0]?.isOwn).toBe(true)
    expect(own[1]?.canReport).toBe(true)
    await expect(
      fan.client.mutation(api.interactions.write.addComment, {
        ...args,
        sourceId: community,
      })
    ).rejects.toThrow("INVALID_INPUT")
    const forgedReply = { ...args, parentId: ids[0] }
    await expect(
      fan.client.mutation(api.interactions.write.addComment, forgedReply)
    ).rejects.toThrow("parentId")
  })
  it("hides suspended/revoked commenters and continues after short or empty native pages", async () => {
    const { t, fan, other, song } = await setup()
    await fan.client.mutation(api.interactions.write.addComment, {
      sourceId: song,
      body: "Hidden",
      requestId: "a",
    })
    await other.client.mutation(api.interactions.write.addComment, {
      sourceId: song,
      body: "Visible",
      requestId: "b",
    })
    await t.run((ctx) =>
      ctx.db.patch("members", fan.id, { status: "suspended" })
    )
    const first = await t.query(api.interactions.read.comments, {
      sourceId: song,
      paginationOpts: { numItems: 1, cursor: null },
    })
    expect(first.page).toEqual([])
    expect(first.isDone).toBe(false)
    const next = await t.query(api.interactions.read.comments, {
      sourceId: song,
      paginationOpts: { numItems: 1, cursor: first.continueCursor },
    })
    expect(next.page[0]?.body).toBe("Visible")
  })
  it("author deletion erases text and cannot restore it by retry; nonauthors are forbidden", async () => {
    const { t, fan, other, song } = await setup()
    const args = { sourceId: song, body: "Erase me", requestId: "one" }
    const id = await fan.client.mutation(
      api.interactions.write.addComment,
      args
    )
    await expect(
      other.client.mutation(api.interactions.write.deleteComment, {
        commentId: id,
      })
    ).rejects.toThrow("FORBIDDEN")
    await fan.client.mutation(api.interactions.write.deleteComment, {
      commentId: id,
    })
    await fan.client.mutation(api.interactions.write.deleteComment, {
      commentId: id,
    })
    expect(
      await fan.client.mutation(api.interactions.write.addComment, args)
    ).toBe(id)
    expect(await t.run((ctx) => ctx.db.get("songComments", id))).toMatchObject({
      body: "",
      status: "deleted",
    })
    expect(
      (
        await t.query(api.interactions.read.comments, {
          sourceId: song,
          paginationOpts: page,
        })
      ).page
    ).toEqual([])
  })
  it("deduplicates private reports without hiding comments; only admins may resolve with a reason", async () => {
    const { t, fan, other, admin, song } = await setup()
    const id = await fan.client.mutation(api.interactions.write.addComment, {
      sourceId: song,
      body: "Reported",
      requestId: "a",
    })
    await expect(
      fan.client.mutation(api.interactions.write.reportComment, {
        commentId: id,
        reason: "Self",
      })
    ).rejects.toThrow("SELF_REPORT_FORBIDDEN")
    const args = { commentId: id, reason: "Private signal" }
    const reportId = await other.client.mutation(
      api.interactions.write.reportComment,
      args
    )
    expect(
      await other.client.mutation(api.interactions.write.reportComment, args)
    ).toBe(reportId)
    expect(
      (
        await t.query(api.interactions.read.comments, {
          sourceId: song,
          paginationOpts: page,
        })
      ).page
    ).toHaveLength(1)
    await expect(
      other.client.query(api.interactions.moderation.getReport, { reportId })
    ).rejects.toThrow("FORBIDDEN")
    await expect(
      t.query(api.interactions.moderation.listReports, {
        status: "open",
        paginationOpts: page,
      })
    ).rejects.toThrow("UNAUTHENTICATED")
    await expect(
      other.client.mutation(api.interactions.moderation.resolve, {
        reportId,
        action: "remove",
        reason: "No",
      })
    ).rejects.toThrow("FORBIDDEN")
    await expect(
      admin.client.mutation(api.interactions.moderation.resolve, {
        reportId,
        action: "remove",
        reason: " ",
      })
    ).rejects.toThrow("INVALID_INPUT")
    const decision = {
      reportId,
      action: "remove" as const,
      reason: "Policy violation",
    }
    await Promise.all([
      admin.client.mutation(api.interactions.moderation.resolve, decision),
      admin.client.mutation(api.interactions.moderation.resolve, decision),
    ])
    expect(
      (
        await t.query(api.interactions.read.comments, {
          sourceId: song,
          paginationOpts: page,
        })
      ).page
    ).toEqual([])
    expect(await t.run((ctx) => ctx.db.get("songComments", id))).toMatchObject({
      body: "",
      status: "removed",
    })
    expect(
      (
        await admin.client.query(api.interactions.moderation.getReport, {
          reportId,
        })
      ).report
    ).toMatchObject({
      action: "remove",
      decisionReason: "Policy violation",
      moderatorMemberId: admin.id,
    })
    await expect(
      admin.client.mutation(api.interactions.moderation.resolve, {
        ...decision,
        action: "dismiss",
      })
    ).rejects.toThrow("REPORT_RESOLVED")
  })
  it("dismisses without removing and can resolve after author deletion without retaining erased text", async () => {
    const { t, fan, other, admin, community } = await setup()
    const commentId = await fan.client.mutation(
      api.interactions.write.addComment,
      { sourceId: community, body: "Fine", requestId: "fine" }
    )
    const reportId = await other.client.mutation(
      api.interactions.write.reportComment,
      { commentId, reason: "Review" }
    )
    await admin.client.mutation(api.interactions.moderation.resolve, {
      reportId,
      action: "dismiss",
      reason: "Allowed",
    })
    expect(
      (
        await t.query(api.interactions.read.comments, {
          sourceId: community,
          paginationOpts: page,
        })
      ).page
    ).toHaveLength(1)
    await fan.client.mutation(api.interactions.write.deleteComment, {
      commentId,
    })
    expect(
      (
        await admin.client.query(api.interactions.moderation.getReport, {
          reportId,
        })
      ).comment?.body
    ).toBe("")
  })
  it("bounds text, paging and write rate; idempotent retries spend no extra quota", async () => {
    const { t, fan, song } = await setup()
    for (const body of [" ", "x".repeat(501)])
      await expect(
        fan.client.mutation(api.interactions.write.addComment, {
          sourceId: song,
          body,
          requestId: "bad",
        })
      ).rejects.toThrow("INVALID_INPUT")
    for (let i = 0; i < 5; i++)
      await fan.client.mutation(api.interactions.write.addComment, {
        sourceId: song,
        body: "Bounded",
        requestId: String(i),
      })
    await fan.client.mutation(api.interactions.write.addComment, {
      sourceId: song,
      body: "Bounded",
      requestId: "4",
    })
    await expect(
      fan.client.mutation(api.interactions.write.addComment, {
        sourceId: song,
        body: "Exceeded",
        requestId: "6",
      })
    ).rejects.toThrow()
    await expect(
      t.query(api.interactions.read.comments, {
        sourceId: song,
        paginationOpts: { numItems: 51, cursor: null },
      })
    ).rejects.toThrow("INVALID_INPUT")
  })
  it("cleans member likes/comments and anonymizes foreign report history in bounded batches", async () => {
    const { t, fan, other, admin, song } = await setup()
    const commentId = await fan.client.mutation(
      api.interactions.write.addComment,
      { sourceId: song, body: "Gone", requestId: "a" }
    )
    const reportId = await other.client.mutation(
      api.interactions.write.reportComment,
      { commentId, reason: "Private reason" }
    )
    await admin.client.mutation(api.interactions.moderation.resolve, {
      reportId,
      action: "dismiss",
      reason: "Allowed",
    })
    await fan.client.mutation(api.interactions.write.setLike, {
      sourceId: song,
      liked: true,
    })
    for (const owner of [fan.id, other.id, admin.id])
      await t.run(async (ctx) => {
        for (let i = 0; i < 10; i++)
          if (!(await cleanMemberInteractions(ctx, owner))) break
      })
    expect(
      await t.query(api.interactions.read.summary, { sourceId: song })
    ).toEqual({ count: 0, liked: false })
    expect(
      await t.run((ctx) => ctx.db.get("songComments", commentId))
    ).toMatchObject({ body: "", status: "deleted" })
    const report = await t.run((ctx) => ctx.db.get("commentReports", reportId))
    expect(report?.reason).toBe("Reporter account deleted.")
    expect(report?.moderatorMemberId).toBeUndefined()
    expect(report?.reporterMemberId).toBeUndefined()
  })
  it("queues source deletion cleanup atomically, recovers stalled jobs and removes dependent reports", async () => {
    const { t, fan, other, community } = await setup()
    const commentId = await fan.client.mutation(
      api.interactions.write.addComment,
      { sourceId: community, body: "Gone with source", requestId: "a" }
    )
    await other.client.mutation(api.interactions.write.reportComment, {
      commentId,
      reason: "Private",
    })
    await fan.client.mutation(api.interactions.write.setLike, {
      sourceId: community,
      liked: true,
    })
    await t.run(async (rawCtx) => {
      const ctx = catalogueAggregateTriggers.wrapDB(rawCtx)
      await ctx.db.delete("communityContributions", community)
    })
    expect(
      await t.query(api.interactions.read.summary, { sourceId: community })
    ).toBeNull()
    const job = await t.run((ctx) =>
      ctx.db.query("interactionCleanupJobs").first()
    )
    expect(job).not.toBeNull()
    await t.run((ctx) =>
      ctx.db.patch("interactionCleanupJobs", job!._id, { updatedAt: 0 })
    )
    await t.mutation(internal.interactions.cleanup.recover, {})
    for (let i = 0; i < 8; i++)
      await t.mutation(internal.interactions.cleanup.process, {
        jobId: job!._id,
      })
    expect(
      await t.run((ctx) => ctx.db.query("songComments").first())
    ).toBeNull()
    expect(
      await t.run((ctx) => ctx.db.query("commentReports").first())
    ).toBeNull()
    expect(await t.run((ctx) => ctx.db.query("songLikes").first())).toBeNull()
    expect(
      await t.run((ctx) => ctx.db.query("songLikeCounts").first())
    ).toBeNull()
    await t.finishInProgressScheduledFunctions()
  })
  it("account deletion revokes visibility immediately and final-phase guard cleans interactions", async () => {
    const { t, other, song } = await setup()
    await other.client.mutation(api.interactions.write.setLike, {
      sourceId: song,
      liked: true,
    })
    await other.client.mutation(api.interactions.write.addComment, {
      sourceId: song,
      body: "To erase",
      requestId: "a",
    })
    await t.run((ctx) =>
      beginAccountDeletion(ctx, other.identity.tokenIdentifier)
    )
    expect(
      (
        await t.query(api.interactions.read.comments, {
          sourceId: song,
          paginationOpts: page,
        })
      ).page
    ).toEqual([])
    const job = await t.run((ctx) =>
      ctx.db.query("accountDeletionJobs").first()
    )
    await t.run((ctx) =>
      ctx.db.patch("accountDeletionJobs", job!._id, { phase: "member" })
    )
    for (let i = 0; i < 10; i++)
      await t.mutation(internal.accounts.deletion.processBatch, {
        jobId: job!._id,
      })
    expect(await t.run((ctx) => ctx.db.get("members", other.id))).toBeNull()
    expect(
      await t.query(api.interactions.read.summary, { sourceId: song })
    ).toEqual({ count: 0, liked: false })
    await t.finishInProgressScheduledFunctions()
  })
  it("accepts categorized reports with optional details, keeps legacy validation and exposes only public avatar/role metadata", async () => {
    const { t, artist, other, admin, song } = await setup()
    const commentId = await artist.client.mutation(
      api.interactions.write.addComment,
      { sourceId: song, body: "A".repeat(500), requestId: "exact-limit" }
    )
    const cards = await t.query(api.interactions.read.comments, {
      sourceId: song,
      paginationOpts: page,
    })
    expect(cards.page[0]?.author).toEqual({
      handle: "artist",
      displayName: "artist",
      role: "artist",
      avatarUrl: null,
    })
    await expect(
      other.client.mutation(api.interactions.write.reportComment, {
        commentId,
        reason: " ",
      })
    ).rejects.toThrow("INVALID_INPUT")
    await expect(
      other.client.mutation(api.interactions.write.reportComment, {
        commentId,
        category: "spam",
        reason: "x".repeat(1001),
      })
    ).rejects.toThrow("INVALID_INPUT")
    const reportId = await other.client.mutation(
      api.interactions.write.reportComment,
      { commentId, category: "spam", reason: "" }
    )
    expect(
      (
        await admin.client.query(api.interactions.moderation.getReport, {
          reportId,
        })
      ).report
    ).toMatchObject({ category: "spam", reason: "", status: "open" })
    await expect(
      other.client.mutation(api.interactions.write.reportComment, {
        commentId,
        category: "other",
        reason: "",
      })
    ).resolves.toBe(reportId)
  })
})
