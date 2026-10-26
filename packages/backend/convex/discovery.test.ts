/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import aggregateTest from "@convex-dev/aggregate/test"
import rateLimiterTest from "@convex-dev/rate-limiter/test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { catalogueAggregateTriggers } from "./catalogue/aggregates"
import { beginAccountDeletion } from "./accounts/deletion"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")
async function backend(initialized = true) {
  const t = convexTest(schema, modules)
  for (const name of [
    "publicDiscovery",
    "catalogueSongs",
    "catalogueSongsByStatus",
    "catalogueAlbums",
    "catalogueAlbumsByStatus",
    "catalogueAlbumTracks",
  ])
    aggregateTest.register(t, name)
  rateLimiterTest.register(t)
  if (initialized)
    await t.run((ctx) =>
      ctx.db.insert("discoveryState", {
        key: "public",
        initialized: true,
        pendingJobs: 0,
      })
    )
  return t
}
type Backend = Awaited<ReturnType<typeof backend>>
async function member(
  t: Backend,
  name: string,
  role: "artist" | "fan" = "artist"
) {
  const client = t.withIdentity({
    tokenIdentifier: `issuer|${name}`,
    issuer: "issuer",
    subject: name,
    email: `${name}@example.com`,
    emailVerified: true,
  })
  const { memberId } = await client.mutation(api.members.completeOnboarding, {
    role,
    handle: name,
    displayName: name,
  })
  return { memberId, client }
}
async function song(
  t: Backend,
  ownerMemberId: Id<"members">,
  title: string,
  publishedAt: number,
  status: "published" | "draft" = "published",
  genre?: "pop" | "rock",
  raw = false
) {
  return t.run(async (rawCtx) => {
    const ctx = raw ? rawCtx : catalogueAggregateTriggers.wrapDB(rawCtx)
    return ctx.db.insert("songs", {
      ownerMemberId,
      title,
      primaryArtist: "Credited artist",
      status,
      firstPublishedAt: publishedAt,
      guestArtists: [],
      writers: [],
      composers: [],
      producers: [],
      listeningLinks: [],
      lyricsText: "[Verse]\nRaw lyrics",
      ...(genre ? { genre } : {}),
      createdAt: publishedAt,
      updatedAt: publishedAt,
    })
  })
}
async function contribution(
  t: Backend,
  authorMemberId: Id<"members">,
  title: string,
  firstPublishedAt: number,
  status: "published" | "hidden" | "removed" = "published"
) {
  return t.run((rawCtx) =>
    catalogueAggregateTriggers
      .wrapDB(rawCtx)
      .db.insert("communityContributions", {
        authorMemberId,
        title,
        primaryArtist: "Credited artist",
        lyricsText: "Raw Fan lyrics",
        requestId: title,
        status,
        revision: 1,
        firstPublishedAt,
        updatedAt: firstPublishedAt,
      })
  )
}
async function drainJobs(t: Backend) {
  for (let i = 0; i < 200; i++) {
    const jobs = await t.run((ctx) => ctx.db.query("discoveryJobs").take(10))
    if (!jobs.length) return
    for (const job of jobs)
      await t.mutation(internal.discovery.maintenance.processJob, {
        jobId: job._id,
      })
  }
  throw new Error("Discovery maintenance did not finish.")
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-26T12:00:00Z"))
})
afterEach(() => vi.useRealTimers())

describe("unified public discovery", () => {
  it("orders both origins together with exact totals and numbered boundaries", async () => {
    const t = await backend(),
      artist = await member(t, "mixed-artist"),
      fan = await member(t, "mixed-fan", "fan")
    const first = await song(
      t,
      artist.memberId,
      "Old artist",
      10,
      "published",
      "pop"
    )
    const middle = await contribution(t, fan.memberId, "Middle fan", 20)
    const latest = await song(
      t,
      artist.memberId,
      "New artist",
      30,
      "published",
      "rock"
    )
    await song(t, artist.memberId, "Private draft", 100, "draft")
    await contribution(t, fan.memberId, "Hidden", 100, "hidden")
    await contribution(t, fan.memberId, "Removed", 100, "removed")
    const page1 = await t.query(api.discovery.read.listSongs, {
      page: 1,
      pageSize: 2,
    })
    expect(page1).toMatchObject({ ready: true, total: 3, pageCount: 2 })
    expect(page1.items.map((row) => row.id)).toEqual([latest, middle])
    expect(page1.items.map((row) => row.origin)).toEqual([
      "artist",
      "community",
    ])
    const page2 = await t.query(api.discovery.read.listSongs, {
      page: 2,
      pageSize: 2,
    })
    expect(page2.items.map((row) => row.id)).toEqual([first])
    expect(
      await t.query(api.discovery.read.listSongs, { page: 100, pageSize: 2 })
    ).toMatchObject({ page: 2, total: 3 })
    expect(
      (
        await t.query(api.discovery.read.listSongs, { page: 1, genre: "rock" })
      ).items.map((row) => row.id)
    ).toEqual([latest])
    expect(
      await t.query(api.discovery.read.listSongs, {
        page: 1,
        origin: "community",
      })
    ).toMatchObject({ total: 1, items: [{ id: middle }] })
    expect(
      await t.query(api.discovery.read.listSongs, {
        page: 1,
        artistHandle: "mixed-artist",
        genre: "pop",
      })
    ).toMatchObject({ total: 1, items: [{ id: first }] })
    expect(
      await t.query(api.discovery.read.listSongs, {
        page: 1,
        artistHandle: "mixed-artist",
        origin: "community",
      })
    ).toMatchObject({ total: 0 })
    const serialized = JSON.stringify(page1)
    for (const privateField of [
      "ownerMemberId",
      "authorMemberId",
      "email",
      "lyricsText",
      "requestId",
      "revision",
      "storageId",
    ])
      expect(serialized).not.toContain(privateField)
  })

  it("keeps first-publication ties deterministic across edits and moderation", async () => {
    const t = await backend(),
      artist = await member(t, "stable-artist"),
      fan = await member(t, "stable-fan", "fan")
    const official = await song(t, artist.memberId, "Zebra", 20)
    const community = await contribution(t, fan.memberId, "Alpha", 20)
    const original = await t.query(api.discovery.read.listSongs, { page: 1 })
    expect(original.items.map((row) => row.id)).toEqual(
      [official, community].sort().reverse()
    )
    await t.run((rawCtx) =>
      catalogueAggregateTriggers
        .wrapDB(rawCtx)
        .db.patch("songs", official, { title: "Aardvark", updatedAt: 1000 })
    )
    expect(
      (await t.query(api.discovery.read.listSongs, { page: 1 })).items.map(
        (row) => row.id
      )
    ).toEqual(original.items.map((row) => row.id))
    expect(
      (
        await t.query(api.discovery.read.listSongs, { page: 1, sort: "title" })
      ).items.map((row) => row.title)
    ).toEqual(["Aardvark", "Alpha"])
    await t.run((rawCtx) =>
      catalogueAggregateTriggers
        .wrapDB(rawCtx)
        .db.patch("communityContributions", community, { status: "hidden" })
    )
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ total: 1 })
    await t.run((rawCtx) =>
      catalogueAggregateTriggers
        .wrapDB(rawCtx)
        .db.patch("communityContributions", community, {
          status: "published",
          revision: 2,
        })
    )
    expect(
      (await t.query(api.discovery.read.listSongs, { page: 1 })).items.map(
        (row) => row.id
      )
    ).toEqual(original.items.map((row) => row.id))
    await t.run((rawCtx) =>
      catalogueAggregateTriggers.wrapDB(rawCtx).db.delete("songs", official)
    )
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ total: 1, items: [{ id: community }] })
  })

  it("gates totals immediately on suspension, restarts changed eligibility, and recovers durable jobs", async () => {
    const t = await backend(),
      owner = await member(t, "suspend-owner")
    for (let i = 0; i < 23; i++) await song(t, owner.memberId, `Song ${i}`, i)
    await t.mutation(internal.admin.setAccountSuspension, {
      memberId: owner.memberId,
      suspended: true,
    })
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ ready: false, total: 0, items: [] })
    const job = await t.run((ctx) => ctx.db.query("discoveryJobs").first())
    if (!job) throw new Error("Expected durable owner maintenance.")
    await t.mutation(internal.discovery.maintenance.processJob, {
      jobId: job._id,
    })
    expect(
      (
        await t.run((ctx) =>
          ctx.db
            .query("discoveryEntries")
            .withIndex("by_member_id_and_kind", (q) =>
              q.eq("memberId", owner.memberId).eq("kind", "song")
            )
            .take(30)
        )
      ).length
    ).toBe(13)
    await t.mutation(internal.admin.setAccountSuspension, {
      memberId: owner.memberId,
      suspended: false,
    })
    vi.advanceTimersByTime(61_000)
    await t.mutation(internal.discovery.maintenance.recover, {})
    await drainJobs(t)
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ ready: true, total: 23 })
    await t.mutation(internal.discovery.maintenance.processJob, {
      jobId: job._id,
    })
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ ready: true, total: 23 })
  })

  it("backfills historical sources in bounded idempotent pages and excludes missing/unverified/deleted authors", async () => {
    const t = await backend(false),
      owner = await member(t, "legacy-owner"),
      unverified = await member(t, "legacy-unverified")
    for (let i = 0; i < 21; i++)
      await song(
        t,
        owner.memberId,
        `Legacy ${i}`,
        i,
        "published",
        undefined,
        true
      )
    await t.run((ctx) =>
      ctx.db.patch("members", unverified.memberId, { emailVerified: false })
    )
    await song(
      t,
      unverified.memberId,
      "Not verified",
      100,
      "published",
      undefined,
      true
    )
    await t.mutation(internal.discovery.maintenance.backfill, {})
    await t.mutation(internal.discovery.maintenance.backfill, {})
    expect(
      (await t.run((ctx) => ctx.db.query("discoveryJobs").take(10))).length
    ).toBe(1)
    expect(await t.query(api.discovery.read.home, {})).toMatchObject({
      ready: false,
      songs: [],
    })
    await drainJobs(t)
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ ready: true, total: 21 })
    await t.mutation(internal.discovery.maintenance.backfill, {})
    await drainJobs(t)
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ ready: true, total: 21 })
    await t.run((ctx) => beginAccountDeletion(ctx, "issuer|legacy-owner"))
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ ready: false, total: 0, items: [] })
    await drainJobs(t)
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ ready: true, total: 0 })
  })

  it("bounds home selections and exposes matching artist/album counts", async () => {
    const t = await backend(),
      owner = await member(t, "home-owner")
    const ids = []
    for (let i = 0; i < 10; i++)
      ids.push(await song(t, owner.memberId, `Public ${i}`, i))
    const albumId = await t.run(async (rawCtx) => {
      const ctx = catalogueAggregateTriggers.wrapDB(rawCtx)
      const id = await ctx.db.insert("albums", {
        ownerMemberId: owner.memberId,
        title: "Album",
        status: "published",
        firstPublishedAt: 100,
        credits: [],
        createdAt: 100,
        updatedAt: 100,
      })
      for (const [position, songId] of ids.slice(0, 2).entries())
        await ctx.db.insert("albumTracks", {
          albumId: id,
          songId,
          ownerMemberId: owner.memberId,
          position,
          createdAt: 100,
          updatedAt: 100,
        })
      return id
    })
    const home = await t.query(api.discovery.read.home, {})
    expect(home).toMatchObject({
      ready: true,
      rankingWindowDays: 7,
      countedAudience: "signed-in",
      albums: [{ id: albumId, publishedTrackCount: 2 }],
      artists: [{ handle: "home-owner", songCount: 10, albumCount: 1 }],
    })
    expect(home.songs).toHaveLength(6)
    expect(home.popularSongs).toHaveLength(6)
    expect(
      await t.query(api.discovery.read.artistByHandle, { handle: "home-owner" })
    ).toMatchObject({ ready: true, songCount: 10, albumCount: 1 })
    expect(
      await t.query(api.discovery.read.listAlbums, {
        page: 1,
        artistHandle: "absent",
      })
    ).toMatchObject({ ready: true, total: 0 })
  })
})

describe("honest recent-view ranking", () => {
  it("deduplicates signed-in daily nonself views across both origins and expires them", async () => {
    const t = await backend(),
      owner = await member(t, "ranking-owner"),
      fan = await member(t, "ranking-fan", "fan"),
      viewer = await member(t, "ranking-viewer", "fan")
    const official = await song(t, owner.memberId, "Old viewed", 1)
    const community = await contribution(t, fan.memberId, "New viewed", 2)
    expect(
      await owner.client.mutation(api.discovery.views.recordView, {
        sourceId: official,
        origin: "artist",
      })
    ).toEqual({ counted: false })
    await expect(
      t.mutation(api.discovery.views.recordView, {
        sourceId: official,
        origin: "artist",
      })
    ).rejects.toThrow()
    expect(
      await viewer.client.mutation(api.discovery.views.recordView, {
        sourceId: official,
        origin: "artist",
      })
    ).toEqual({ counted: true })
    expect(
      await viewer.client.mutation(api.discovery.views.recordView, {
        sourceId: official,
        origin: "artist",
      })
    ).toEqual({ counted: false })
    expect(
      (
        await t.query(api.discovery.read.listSongs, {
          page: 1,
          sort: "popular",
        })
      ).items.map((row) => [row.id, row.recentViews])
    ).toEqual([
      [official, 1],
      [community, 0],
    ])
    expect(
      await owner.client.mutation(api.discovery.views.recordView, {
        sourceId: community,
        origin: "community",
      })
    ).toEqual({ counted: true })
    vi.setSystemTime(new Date("2026-10-27T12:00:00Z"))
    await viewer.client.mutation(api.discovery.views.recordView, {
      sourceId: official,
      origin: "artist",
    })
    vi.setSystemTime(new Date("2026-11-02T00:00:00Z"))
    await t.mutation(internal.discovery.maintenance.expireViews, {})
    const results = await t.query(api.discovery.read.listSongs, {
      page: 1,
      sort: "popular",
    })
    expect(results.items.map((row) => [row.id, row.recentViews])).toEqual([
      [official, 1],
      [community, 0],
    ])
    expect(
      (await t.run((ctx) => ctx.db.query("discoveryViews").take(10))).length
    ).toBe(1)
    await t.run((rawCtx) =>
      catalogueAggregateTriggers
        .wrapDB(rawCtx)
        .db.patch("communityContributions", community, { status: "hidden" })
    )
    expect(
      await viewer.client.mutation(api.discovery.views.recordView, {
        sourceId: community,
        origin: "community",
      })
    ).toEqual({ counted: false })
  })

  it("removes viewer identities and their scores through resumable account cleanup", async () => {
    const t = await backend(),
      owner = await member(t, "view-owner"),
      viewer = await member(t, "view-deletion", "fan")
    const id = await song(t, owner.memberId, "Other author", 1)
    await viewer.client.mutation(api.discovery.views.recordView, {
      sourceId: id,
      origin: "artist",
    })
    await t.run((ctx) => beginAccountDeletion(ctx, "issuer|view-deletion"))
    for (let i = 0; i < 30; i++) {
      const job = await t.run((ctx) =>
        ctx.db.query("accountDeletionJobs").first()
      )
      if (!job) break
      await t.mutation(internal.accounts.deletion.processBatch, {
        jobId: job._id,
      })
    }
    await drainJobs(t)
    expect(
      (await t.run((ctx) => ctx.db.query("discoveryViews").take(10))).length
    ).toBe(0)
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ ready: true, total: 1, items: [{ recentViews: 0 }] })
  })
})
