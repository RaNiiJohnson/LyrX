/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import aggregateTest from "@convex-dev/aggregate/test"
import rateLimiterTest from "@convex-dev/rate-limiter/test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { catalogueAggregateTriggers } from "./catalogue/aggregates"
import { beginAccountDeletion } from "./accounts/deletion"
import { changeViews } from "./discovery/projection"
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
        searchVersion: 1,
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
    const ids: Array<Id<"songs">> = []
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
      albums: [{ id: albumId }],
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

  it("propagates large album inheritance through bounded discovery jobs without stale counts", async () => {
    const t = await backend(),
      owner = await member(t, "inherit-owner")
    const albumId = await owner.client.mutation(
      api.catalogue.albums.createAlbum,
      {
        title: "Inherited album",
        genre: "pop",
        credits: [],
      }
    )
    const ids: Array<Id<"songs">> = []
    for (let i = 0; i < 12; i++) {
      const id = await song(t, owner.memberId, `Inherited ${i}`, i, "draft")
      await owner.client.mutation(api.catalogue.albums.attachSongToAlbum, {
        albumId,
        songId: id,
        inheritance: {
          inheritArtwork: true,
          inheritGenre: true,
          inheritLabel: true,
          inheritCredits: true,
        },
      })
      await owner.client.mutation(api.catalogue.songs.publishSong, {
        songId: id,
      })
      ids.push(id)
    }
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1, genre: "pop" })
    ).toMatchObject({ ready: true, total: 12 })
    await owner.client.mutation(api.catalogue.albums.updateAlbum, {
      albumId,
      title: "New inherited album",
      genre: "rock",
      credits: ["Updated credit"],
      songIds: ids,
    })
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ ready: false, total: 0, items: [] })
    const jobs = await t.run((ctx) => ctx.db.query("discoveryJobs").take(2))
    expect(jobs).toHaveLength(1)
    const job = jobs.at(0)
    if (!job) throw new Error("Expected owner discovery job.")
    // Publishing while an owner refresh is pending restarts the durable cursor.
    const first = ids.at(0)
    if (!first) throw new Error("Expected inherited track.")
    await t.mutation(internal.discovery.maintenance.processJob, {
      jobId: job._id,
    })
    await owner.client.mutation(api.catalogue.songs.publishSong, {
      songId: first,
    })
    await drainJobs(t)
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1, genre: "pop" })
    ).toMatchObject({ ready: true, total: 0 })
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1, genre: "rock" })
    ).toMatchObject({
      ready: true,
      total: 1,
      items: [{ id: first, genre: "rock" }],
    })
    // Deleting a large album preserves sources and inherited metadata, while
    // its own public positions disappear before discovery becomes ready again.
    await owner.client.mutation(api.catalogue.albums.deleteAlbum, { albumId })
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ ready: false })
    await drainJobs(t)
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1, genre: "rock" })
    ).toMatchObject({ ready: true, total: 1, items: [{ id: first }] })
    expect(await t.run((ctx) => ctx.db.get("songs", first))).toMatchObject({
      genre: "rock",
      additionalCredits: ["Updated credit"],
    })
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

  it("limits distinct-source view bursts without charging deduplicated retries", async () => {
    const t = await backend(),
      owner = await member(t, "limit-owner"),
      viewer = await member(t, "limit-viewer", "fan")
    const ids: Array<Id<"songs">> = []
    for (let i = 0; i < 11; i++)
      ids.push(await song(t, owner.memberId, `View ${i}`, i))
    for (const id of ids.slice(0, 10)) {
      expect(
        await viewer.client.mutation(api.discovery.views.recordView, {
          sourceId: id,
          origin: "artist",
        })
      ).toEqual({ counted: true })
      // An idempotent retry must not spend the next source's token.
      expect(
        await viewer.client.mutation(api.discovery.views.recordView, {
          sourceId: id,
          origin: "artist",
        })
      ).toEqual({ counted: false })
    }
    const last = ids.at(-1)
    if (!last) throw new Error("Expected throttled source.")
    expect(
      await viewer.client.mutation(api.discovery.views.recordView, {
        sourceId: last,
        origin: "artist",
      })
    ).toEqual({ counted: false })
    vi.setSystemTime(Date.now() + 2_001)
    expect(
      await viewer.client.mutation(api.discovery.views.recordView, {
        sourceId: last,
        origin: "artist",
      })
    ).toEqual({ counted: true })
    await expect(
      viewer.client.mutation(api.discovery.views.recordView, {
        sourceId: last,
        origin: "artist",
        ...{ viewerMemberId: owner.memberId },
      })
    ).rejects.toThrow()
    expect(
      await viewer.client.mutation(api.discovery.views.recordView, {
        sourceId: last,
        origin: "community",
      })
    ).toEqual({ counted: false })
  })

  it("expires at most 25 view records per transaction and materializes a seven-day score", async () => {
    const t = await backend(),
      owner = await member(t, "expiry-owner"),
      viewer = await member(t, "expiry-viewer", "fan")
    const id = await song(t, owner.memberId, "Expiring views", 1)
    await t.run(async (ctx) => {
      for (let i = 0; i < 53; i++)
        await ctx.db.insert("discoveryViews", {
          sourceId: id,
          viewerMemberId: viewer.memberId,
          day: i,
          expiresAt: Date.now() - 1,
        })
      await changeViews(ctx, id, 53)
    })
    for (const remaining of [28, 3, 0]) {
      await t.mutation(internal.discovery.maintenance.expireViews, {})
      expect(
        await t.run((ctx) => ctx.db.query("discoveryViews").take(60))
      ).toHaveLength(remaining)
      expect(
        await t.query(api.discovery.read.listSongs, {
          page: 1,
          sort: "popular",
        })
      ).toMatchObject({ total: 1, items: [{ recentViews: remaining }] })
    }
    // Duplicate scheduled executions cannot make scores negative.
    await t.mutation(internal.discovery.maintenance.expireViews, {})
    expect(
      await t.run((ctx) => ctx.db.query("discoveryScores").first())
    ).toMatchObject({ recentViews: 0 })
  })

  it("cleans deleted source views in bounded retryable batches without touching another source", async () => {
    const t = await backend(),
      owner = await member(t, "cleanup-owner"),
      fan = await member(t, "cleanup-author", "fan"),
      viewer = await member(t, "cleanup-viewer", "fan")
    const removed = await song(t, owner.memberId, "Delete me", 1)
    const kept = await contribution(t, fan.memberId, "Keep me", 2)
    await viewer.client.mutation(api.discovery.views.recordView, {
      sourceId: kept,
      origin: "community",
    })
    await t.run(async (ctx) => {
      for (let i = 0; i < 53; i++)
        await ctx.db.insert("discoveryViews", {
          sourceId: removed,
          viewerMemberId: viewer.memberId,
          day: i,
          expiresAt: Date.now() + 10_000,
        })
      await changeViews(ctx, removed, 53)
    })
    await owner.client.mutation(api.catalogue.songs.deleteSong, {
      songId: removed,
    })
    expect(
      await t.query(api.discovery.read.listSongs, { page: 1 })
    ).toMatchObject({ total: 1, items: [{ id: kept, recentViews: 1 }] })
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("discoveryScores")
          .withIndex("by_source_id", (q) => q.eq("sourceId", removed))
          .unique()
      )
    ).toBeNull()
    for (const remaining of [28, 3, 0]) {
      await t.mutation(internal.discovery.maintenance.cleanSourceViews, {
        sourceId: removed,
      })
      expect(
        await t.run((ctx) =>
          ctx.db
            .query("discoveryViews")
            .withIndex("by_source_id", (q) => q.eq("sourceId", removed))
            .take(60)
        )
      ).toHaveLength(remaining)
    }
    expect(
      await t.run((ctx) => ctx.db.query("discoveryViewCleanup").first())
    ).toBeNull()
    await t.mutation(internal.discovery.maintenance.cleanSourceViews, {
      sourceId: removed,
    })
    expect(
      await t.run((ctx) => ctx.db.query("discoveryViews").take(2))
    ).toHaveLength(1)
    // A deleted community source uses the same cleanup path.
    await t.run((rawCtx) =>
      catalogueAggregateTriggers
        .wrapDB(rawCtx)
        .db.delete("communityContributions", kept)
    )
    await t.mutation(internal.discovery.maintenance.cleanSourceViews, {
      sourceId: kept,
    })
    expect(
      await t.run((ctx) => ctx.db.query("discoveryViews").take(2))
    ).toHaveLength(0)
  })
})

describe("public search", () => {
  const find = (
    t: Backend,
    text: string,
    cursor: string | null = null,
    numItems = 12
  ) =>
    t.query(api.discovery.read.search, {
      text,
      paginationOpts: { cursor, numItems },
    })
  it("searches one public index across origins, artist names, albums, genres and lyrics with bounded excerpts", async () => {
    const t = await backend(),
      artist = await member(t, "search-artist"),
      fan = await member(t, "search-fan", "fan")
    const official = await song(
      t,
      artist.memberId,
      "Hira",
      1,
      "published",
      "pop"
    )
    const community = await contribution(t, fan.memberId, "Fan song", 2)
    await t.run(async (raw) => {
      const ctx = catalogueAggregateTriggers.wrapDB(raw)
      await ctx.db.patch("songs", official, {
        primaryArtist: "Mahaleo",
        lyricsText: "[Refrain]\nTiako ny tanindrazako mandrakizay",
      })
      await ctx.db.patch("communityContributions", community, {
        primaryArtist: "Mahaleo",
        albumTitle: "Reference",
        genre: "rock",
        lyricsText: "Tiako koa ny hira",
      })
      await ctx.db.insert("albums", {
        ownerMemberId: artist.memberId,
        title: "Public album",
        status: "published",
        credits: [],
        firstPublishedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        genre: "jazz",
      })
    })
    expect((await find(t, "Mahaleo")).page.map((x) => x.id).sort()).toEqual(
      [official, community].sort()
    )
    const lyric = await find(t, "tanindrazako")
    expect(lyric.page).toHaveLength(1)
    expect(lyric.page[0]).toMatchObject({
      id: official,
      excerpt: "[Refrain]\nTiako ny tanindrazako mandrakizay",
      origin: "artist",
      href: `/songs/${official}`,
    })
    expect(
      (await find(t, "Tiako")).page.find((x) => x.id === community)
    ).toMatchObject({
      contributor: "search-fan",
      origin: "community",
      href: `/community/${community}`,
    })
    expect((await find(t, "pop")).page.map((x) => x.id)).toEqual([official])
    expect((await find(t, "Reference")).page.map((x) => x.id)).toEqual([
      community,
    ])
    expect((await find(t, "jazz")).page[0]?.kind).toBe("album")
    expect(
      (await find(t, "search-artist")).page.some((x) => x.kind === "artist")
    ).toBe(true)
    expect(JSON.stringify(lyric)).not.toMatch(
      /authUserId|email|lyricsText|searchText|ownerMemberId|reason/
    )
  })
  it("never indexes drafts, hidden or removed contributions and removes old lyric terms on edits", async () => {
    const t = await backend(),
      artist = await member(t, "private-artist"),
      fan = await member(t, "private-fan", "fan")
    await song(t, artist.memberId, "secretword", 1, "draft")
    await contribution(t, fan.memberId, "secretword", 2, "hidden")
    await contribution(t, fan.memberId, "secretword", 3, "removed")
    expect((await find(t, "secretword")).page).toEqual([])
    const id = await contribution(t, fan.memberId, "Visible", 4)
    await t.run((ctx) =>
      catalogueAggregateTriggers
        .wrapDB(ctx)
        .db.patch("communityContributions", id, { lyricsText: "oldword" })
    )
    expect((await find(t, "oldword")).page).toHaveLength(1)
    await t.run((ctx) =>
      catalogueAggregateTriggers
        .wrapDB(ctx)
        .db.patch("communityContributions", id, { lyricsText: "newword" })
    )
    expect((await find(t, "oldword")).page).toEqual([])
    expect((await find(t, "newword")).page).toHaveLength(1)
    await t.run((ctx) =>
      catalogueAggregateTriggers
        .wrapDB(ctx)
        .db.patch("communityContributions", id, { status: "hidden" })
    )
    expect((await find(t, "newword")).page).toEqual([])
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("discoveryEntries")
          .withIndex("by_source_id", (q) => q.eq("sourceId", id))
          .unique()
      )
    ).toBeNull()
  })
  it("fails closed during owner jobs and rechecks suspension, revocation and missing profiles even for stale entries", async () => {
    const t = await backend(),
      artist = await member(t, "revoke-artist")
    await song(t, artist.memberId, "Findme", 1)
    await t.run((ctx) =>
      catalogueAggregateTriggers
        .wrapDB(ctx)
        .db.patch("members", artist.memberId, { status: "suspended" })
    )
    expect(await find(t, "Findme")).toMatchObject({ ready: false, page: [] })
    await drainJobs(t)
    expect((await find(t, "Findme")).page).toEqual([])
    await t.run((ctx) =>
      catalogueAggregateTriggers
        .wrapDB(ctx)
        .db.patch("members", artist.memberId, { status: "active" })
    )
    await drainJobs(t)
    expect((await find(t, "Findme")).page).toHaveLength(1)
    await t.run((ctx) =>
      ctx.db.insert("accountDeletions", {
        authUserId: "issuer|revoke-artist",
        requestedAt: Date.now(),
      })
    )
    expect((await find(t, "Findme")).page).toEqual([])
    const second = await member(t, "profile-artist")
    await song(t, second.memberId, "Findme", 2)
    await t.run(async (ctx) => {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_member_id", (q) => q.eq("memberId", second.memberId))
        .unique()
      await ctx.db.delete("profiles", profile!._id)
    })
    expect((await find(t, "Findme")).page).toEqual([])
  })
  it("uses native cursors for a unified bounded relevance stream, including short pages", async () => {
    const t = await backend(),
      artist = await member(t, "page-artist"),
      fan = await member(t, "page-fan", "fan")
    const a = await song(t, artist.memberId, "Common A", 1)
    const b = await contribution(t, fan.memberId, "Common B", 2)
    const first = await find(t, "Common", null, 1)
    expect(first.page).toHaveLength(1)
    expect(first.isDone).toBe(false)
    const second = await find(t, "Common", first.continueCursor, 1)
    expect(new Set([...first.page, ...second.page].map((x) => x.id))).toEqual(
      new Set([a, b])
    )
    // A stale source still cannot leak even when its index row remains.
    await t.run((ctx) => ctx.db.patch("songs", a, { status: "draft" }))
    const all = await find(t, "Common")
    expect(all.page.map((x) => x.id)).toEqual([b])
  })
  it("requires an explicit completed search backfill for historical discovery state", async () => {
    const t = await backend(),
      artist = await member(t, "legacy-search")
    await song(t, artist.memberId, "Legacy", 1)
    await t.run(async (ctx) => {
      const state = await ctx.db.query("discoveryState").unique()
      await ctx.db.patch("discoveryState", state!._id, {
        searchVersion: undefined,
      })
    })
    expect(await find(t, "Legacy")).toMatchObject({ ready: false, page: [] })
    await t.mutation(internal.discovery.maintenance.backfill, {})
    await drainJobs(t)
    expect(await find(t, "Legacy")).toMatchObject({ ready: true })
    expect(
      (await find(t, "Legacy")).page.some((x) => x.title === "Legacy")
    ).toBe(true)
  })
  it("refreshes album artist names through bounded jobs and deletes withdrawn source text", async () => {
    const t = await backend(),
      artist = await member(t, "beforeword")
    const id = await t.run((ctx) =>
      catalogueAggregateTriggers.wrapDB(ctx).db.insert("albums", {
        ownerMemberId: artist.memberId,
        title: "Release",
        status: "published",
        credits: [],
        firstPublishedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      })
    )
    expect((await find(t, "beforeword")).page.some((x) => x.id === id)).toBe(
      true
    )
    await t.run(async (raw) => {
      const ctx = catalogueAggregateTriggers.wrapDB(raw)
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_member_id", (q) => q.eq("memberId", artist.memberId))
        .unique()
      await ctx.db.patch("profiles", profile!._id, { displayName: "afterword" })
    })
    expect((await find(t, "afterword")).ready).toBe(false)
    await drainJobs(t)
    expect((await find(t, "afterword")).page.some((x) => x.id === id)).toBe(
      true
    )
    // The old handle remains searchable on the artist, but not on album metadata.
    expect((await find(t, "beforeword")).page.some((x) => x.id === id)).toBe(
      false
    )
    await t.run((ctx) =>
      catalogueAggregateTriggers.wrapDB(ctx).db.delete("albums", id)
    )
    expect((await find(t, "Release")).page).toEqual([])
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("discoveryEntries")
          .withIndex("by_source_id", (q) => q.eq("sourceId", id))
          .unique()
      )
    ).toBeNull()
  })
  it("rejects oversized or tokenless requests and invalid page bounds", async () => {
    const t = await backend()
    for (const text of [
      "",
      "!!!",
      "a".repeat(33),
      "one ".repeat(17),
      "a ".repeat(101),
    ])
      await expect(find(t, text)).rejects.toThrow(/Search requires/)
    for (const size of [0, -1, 13, 25, 1.5])
      await expect(find(t, "word", null, size)).rejects.toThrow(
        /Search requires/
      )
  })
})
