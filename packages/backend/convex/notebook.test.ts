/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { describe, it, expect } from "vitest"
import aggregateTest from "@convex-dev/aggregate/test"
import rateLimiterTest from "@convex-dev/rate-limiter/test"
import schema from "./schema"
import { api, internal } from "./_generated/api"
import { beginAccountDeletion } from "./accounts/deletion"
import { catalogueAggregateTriggers } from "./catalogue/aggregates"

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
function fixtureFirst<T>(values: Array<T>): T {
  const value = values.at(0)
  if (value === undefined) throw new Error("Expected a fixture row")
  return value
}
const page = { numItems: 2, cursor: null }
const read = (client: Awaited<ReturnType<typeof setup>>["fan"]["client"]) =>
  client.query(api.notebook.read.passages, {
    paginationOpts: { numItems: 24, cursor: null },
  })
const sourceText = "Original technical lyrics"
const savedRange = { sourceText, start: 0, end: 8, collectionId: null }
describe("private lyric notebook", () => {
  it("isolates both roles and admins; rejects forged collection and passage IDs on every operation", async () => {
    const { t, fan, other, admin, artist, song } = await setup()
    expect(await fan.client.query(api.notebook.read.collections, {})).toEqual(
      []
    )
    const collection = await fan.client.mutation(
      api.notebook.write.createCollection,
      { name: "Private" }
    )
    const passageId = await fan.client.mutation(api.notebook.write.save, {
      ...savedRange,
      sourceId: song,
      collectionId: collection,
    })
    for (const client of [other.client, admin.client, artist.client]) {
      expect((await read(client)).page).toEqual([])
      expect(await client.query(api.notebook.read.collections, {})).toEqual([])
      await expect(
        client.query(api.notebook.read.passages, {
          collectionId: collection,
          paginationOpts: page,
        })
      ).rejects.toThrow("NOT_FOUND")
      await expect(
        client.mutation(api.notebook.write.save, {
          ...savedRange,
          sourceId: song,
          collectionId: collection,
        })
      ).rejects.toThrow("NOT_FOUND")
      await expect(
        client.mutation(api.notebook.write.renameCollection, {
          collectionId: collection,
          name: "Stolen",
        })
      ).rejects.toThrow("NOT_FOUND")
      await expect(
        client.mutation(api.notebook.write.deleteCollection, {
          collectionId: collection,
        })
      ).rejects.toThrow("NOT_FOUND")
      await expect(
        client.mutation(api.notebook.write.move, {
          passageId,
          collectionId: null,
        })
      ).rejects.toThrow("NOT_FOUND")
      await expect(
        client.mutation(api.notebook.write.remove, { passageId })
      ).rejects.toThrow("NOT_FOUND")
    }
    await expect(t.query(api.notebook.read.collections, {})).rejects.toThrow(
      "UNAUTHENTICATED"
    )
    await expect(
      t.query(api.notebook.read.passages, { paginationOpts: page })
    ).rejects.toThrow("UNAUTHENTICATED")
    await expect(
      t.mutation(api.notebook.write.save, { ...savedRange, sourceId: song })
    ).rejects.toThrow("UNAUTHENTICATED")
  })
  it("saves exact repeated-text ranges for both origins; deduplicates concurrent saves and collection creation", async () => {
    const { t, fan, artist, song, community } = await setup()
    const collections = await Promise.all(
      Array.from({ length: 3 }, () =>
        fan.client.mutation(api.notebook.write.createCollection, {
          name: "  Travel  ",
        })
      )
    )
    expect(new Set(collections).size).toBe(1)
    const ids = await Promise.all(
      Array.from({ length: 3 }, () =>
        fan.client.mutation(api.notebook.write.save, {
          ...savedRange,
          sourceId: song,
        })
      )
    )
    expect(new Set(ids).size).toBe(1)
    await artist.client.mutation(api.notebook.write.save, {
      sourceId: community,
      sourceText: "Original fan test lyrics",
      start: 0,
      end: 12,
      collectionId: null,
    })
    expect((await read(artist.client)).page[0]).toMatchObject({
      text: "Original fan",
      state: "current",
      source: { origin: "community" },
    })
    const stored = await t.run((ctx) =>
      ctx.db.get("notebookPassages", fixtureFirst(ids))
    )
    expect(stored?.snapshot).toMatchObject({
      start: 0,
      end: 8,
      text: "Original",
    })
    expect(stored?.snapshot?.fingerprint).toHaveLength(64)
    await t.run((ctx) =>
      ctx.db.patch("songs", song, { lyricsText: "echo echo" })
    )
    await fan.client.mutation(api.notebook.write.save, {
      sourceId: song,
      sourceText: "echo echo",
      start: 5,
      end: 9,
      collectionId: fixtureFirst(collections),
    })
    expect((await read(fan.client)).page[0]).toMatchObject({
      text: "echo",
      state: "current",
    })
  })
  it("retains clearly marked saved text after source edits, rejects stale saves, and hides every snapshot field on withdrawal", async () => {
    const { t, fan, song } = await setup()
    const id = await fan.client.mutation(api.notebook.write.save, {
      ...savedRange,
      sourceId: song,
    })
    await t.run((ctx) =>
      ctx.db.patch("songs", song, { lyricsText: "Edited lyrics" })
    )
    expect((await read(fan.client)).page[0]).toMatchObject({
      text: "Original",
      state: "changed",
    })
    await expect(
      fan.client.mutation(api.notebook.write.save, {
        ...savedRange,
        sourceId: song,
      })
    ).rejects.toThrow("NOTEBOOK_SOURCE_CHANGED")
    await t.run((ctx) => ctx.db.patch("songs", song, { status: "draft" }))
    expect((await read(fan.client)).page[0]).toEqual({
      id,
      savedAt: expect.any(Number),
      collectionId: null,
      state: "unavailable",
      text: null,
      source: null,
    })
    await expect(
      fan.client.mutation(api.notebook.write.save, {
        ...savedRange,
        sourceId: song,
      })
    ).rejects.toThrow("NOT_FOUND")
  })
  it("redacts stored content in bounded withdrawal jobs and never reconstructs purged excerpts on republication", async () => {
    const { t, fan, song, artist } = await setup()
    const id = await fan.client.mutation(api.notebook.write.save, {
      ...savedRange,
      sourceId: song,
    })
    await t.run((ctx) =>
      catalogueAggregateTriggers
        .wrapDB(ctx)
        .db.patch("songs", song, { status: "draft" })
    )
    const jobs = await t.run((ctx) =>
      ctx.db.query("notebookCleanupJobs").take(10)
    )
    expect(jobs).toHaveLength(1)
    await t.mutation(internal.notebook.cleanup.process, {
      jobId: fixtureFirst(jobs)._id,
    })
    expect(
      (await t.run((ctx) => ctx.db.get("notebookPassages", id)))?.snapshot
    ).toBeUndefined()
    await t.run((ctx) => ctx.db.patch("songs", song, { status: "published" }))
    expect((await read(fan.client)).page[0]?.state).toBe("unavailable")
    // A fresh save remains possible after restoration.
    await fan.client.mutation(api.notebook.write.save, {
      ...savedRange,
      sourceId: song,
    })
    await t.run((ctx) =>
      catalogueAggregateTriggers
        .wrapDB(ctx)
        .db.patch("members", artist.id, { status: "suspended" })
    )
    expect(
      (await read(fan.client)).page.every((row) => row.text === null)
    ).toBe(true)
    const ownerJob = await t.run((ctx) =>
      ctx.db
        .query("notebookCleanupJobs")
        .withIndex("by_target_id", (q) => q.eq("targetId", artist.id))
        .unique()
    )
    await t.mutation(internal.notebook.cleanup.process, {
      jobId: ownerJob!._id,
    })
    expect(
      (await t.run((ctx) => ctx.db.query("notebookPassages").take(10))).every(
        (row) => !row.snapshot
      )
    ).toBe(true)
  })
  it("handles hidden/removed/deleted community sources and suspended or revoked notebook owners", async () => {
    const { t, other, community, fan } = await setup()
    const args = {
      sourceId: community,
      sourceText: "Original fan test lyrics",
      start: 0,
      end: 8,
      collectionId: null,
    }
    await other.client.mutation(api.notebook.write.save, args)
    for (const status of ["hidden", "removed"] as const) {
      await t.run((ctx) =>
        ctx.db.patch("communityContributions", community, { status })
      )
      expect((await read(other.client)).page[0]?.text).toBeNull()
      await expect(
        other.client.mutation(api.notebook.write.save, args)
      ).rejects.toThrow("NOT_FOUND")
    }
    await t.run((ctx) => ctx.db.delete("communityContributions", community))
    expect((await read(other.client)).page[0]?.source).toBeNull()
    await t.run((ctx) =>
      ctx.db.patch("members", other.id, { status: "suspended" })
    )
    await expect(read(other.client)).rejects.toThrow("ACCOUNT_SUSPENDED")
    await t.run((ctx) =>
      ctx.db.insert("accountDeletions", {
        authUserId: fan.identity.tokenIdentifier,
        requestedAt: 0,
      })
    )
    await expect(
      fan.client.query(api.notebook.read.collections, {})
    ).rejects.toThrow("UNAUTHENTICATED")
  })
  it("moves passages, restores the default on collection deletion and paginates independently per collection", async () => {
    const { fan, song } = await setup()
    const collectionId = await fan.client.mutation(
      api.notebook.write.createCollection,
      { name: "Collection" }
    )
    const first = await fan.client.mutation(api.notebook.write.save, {
      ...savedRange,
      sourceId: song,
    })
    await fan.client.mutation(api.notebook.write.save, {
      ...savedRange,
      sourceId: song,
      start: 9,
      end: 18,
    })
    const firstPage = await fan.client.query(api.notebook.read.passages, {
      paginationOpts: { numItems: 1, cursor: null },
    })
    expect(firstPage.page).toHaveLength(1)
    expect(firstPage.isDone).toBe(false)
    const secondPage = await fan.client.query(api.notebook.read.passages, {
      paginationOpts: { numItems: 1, cursor: firstPage.continueCursor },
    })
    expect(secondPage.page[0]?.id).not.toBe(firstPage.page[0]?.id)
    await fan.client.mutation(api.notebook.write.move, {
      passageId: first,
      collectionId,
    })
    expect(
      (
        await fan.client.query(api.notebook.read.passages, {
          collectionId,
          paginationOpts: page,
        })
      ).page
    ).toHaveLength(1)
    await fan.client.mutation(api.notebook.write.renameCollection, {
      collectionId,
      name: "Renamed",
    })
    expect(await fan.client.query(api.notebook.read.collections, {})).toEqual([
      { id: collectionId, name: "Renamed" },
    ])
    await fan.client.mutation(api.notebook.write.deleteCollection, {
      collectionId,
    })
    await fan.client.mutation(api.notebook.write.deleteCollection, {
      collectionId,
    })
    expect(
      (await read(fan.client)).page.every((row) => row.collectionId === null)
    ).toBe(true)
    await fan.client.mutation(api.notebook.write.remove, { passageId: first })
    await fan.client.mutation(api.notebook.write.remove, { passageId: first })
    expect((await read(fan.client)).page).toHaveLength(1)
  })
  it("bounds names, selection, quotas and page sizes, preserving exact Unicode and source whitespace", async () => {
    const { t, fan, song } = await setup()
    for (const name of [" ", "a".repeat(61)])
      await expect(
        fan.client.mutation(api.notebook.write.createCollection, { name })
      ).rejects.toThrow("NOTEBOOK_NAME")
    for (const [start, end] of [
      [-1, 1],
      [1.5, 4],
      [4, 2],
      [0, 5000],
      [0, 0],
    ] as const)
      await expect(
        fan.client.mutation(api.notebook.write.save, {
          ...savedRange,
          sourceId: song,
          start,
          end,
        })
      ).rejects.toThrow("NOTEBOOK_RANGE")
    const text = "\r\n😀 teny\n\n"
    await t.run((ctx) => ctx.db.patch("songs", song, { lyricsText: text }))
    await expect(
      fan.client.mutation(api.notebook.write.save, {
        sourceId: song,
        sourceText: text,
        start: 2,
        end: 3,
        collectionId: null,
      })
    ).rejects.toThrow("NOTEBOOK_RANGE")
    await fan.client.mutation(api.notebook.write.save, {
      sourceId: song,
      sourceText: text,
      start: 2,
      end: 4,
      collectionId: null,
    })
    expect((await read(fan.client)).page[0]?.text).toBe("😀")
    await expect(
      fan.client.query(api.notebook.read.passages, {
        paginationOpts: { numItems: 51, cursor: null },
      })
    ).rejects.toThrow()
    await t.run(async (ctx) => {
      for (let n = 0; n < 40; n++)
        await ctx.db.insert("notebookCollections", {
          memberId: fan.id,
          name: `Seed ${n}`,
        })
      for (let n = 0; n < 499; n++)
        await ctx.db.insert("notebookPassages", {
          memberId: fan.id,
          collectionId: null,
          sourceId: song,
          sourceOwnerId: fan.id,
        })
    })
    await expect(
      fan.client.mutation(api.notebook.write.createCollection, {
        name: "Too many",
      })
    ).rejects.toThrow("NOTEBOOK_LIMIT")
    await expect(
      fan.client.mutation(api.notebook.write.save, {
        sourceId: song,
        sourceText: text,
        start: 2,
        end: 6,
        collectionId: null,
      })
    ).rejects.toThrow("NOTEBOOK_LIMIT")
  })
  it("erases the notebook through the resumable account cleanup guard", async () => {
    const { t, fan, song } = await setup()
    await fan.client.mutation(api.notebook.write.createCollection, {
      name: "Private",
    })
    await fan.client.mutation(api.notebook.write.save, {
      ...savedRange,
      sourceId: song,
    })
    await t.run((ctx) =>
      beginAccountDeletion(ctx, fan.identity.tokenIdentifier)
    )
    await expect(read(fan.client)).rejects.toThrow("UNAUTHENTICATED")
    // Exercise the real account job, rather than only the notebook helper.
    for (let batch = 0; batch < 100; batch++) {
      const job = await t.run((ctx) =>
        ctx.db
          .query("accountDeletionJobs")
          .withIndex("by_member_id", (q) => q.eq("memberId", fan.id))
          .unique()
      )
      if (!job) break
      await t.mutation(internal.accounts.deletion.processBatch, {
        jobId: job._id,
      })
    }
    expect(await t.run((ctx) => ctx.db.get("members", fan.id))).toBeNull()
    expect(
      await t.run((ctx) => ctx.db.query("notebookPassages").take(10))
    ).toEqual([])
    expect(
      await t.run((ctx) => ctx.db.query("notebookCollections").take(10))
    ).toEqual([])
  })
  it("continues withdrawal cleanup beyond one batch and recovers a stalled job", async () => {
    const { t, fan, song } = await setup()
    const id = await fan.client.mutation(api.notebook.write.save, {
      ...savedRange,
      sourceId: song,
    })
    await t.run(async (ctx) => {
      const row = await ctx.db.get("notebookPassages", id)
      if (!row) throw new Error("Fixture missing")
      for (let n = 0; n < 26; n++)
        await ctx.db.insert("notebookPassages", {
          memberId: row.memberId,
          collectionId: null,
          sourceId: song,
          sourceOwnerId: row.sourceOwnerId,
          snapshot: row.snapshot,
        })
      await catalogueAggregateTriggers
        .wrapDB(ctx)
        .db.patch("songs", song, { status: "draft" })
    })
    const job = await t.run((ctx) =>
      ctx.db.query("notebookCleanupJobs").first()
    )
    if (!job) throw new Error("Cleanup job missing")
    await t.mutation(internal.notebook.cleanup.process, { jobId: job._id })
    const remaining = await t.run((ctx) =>
      ctx.db.query("notebookPassages").take(30)
    )
    expect(remaining.filter((row) => row.snapshot)).toHaveLength(2)
    await t.run((ctx) =>
      ctx.db.patch("notebookCleanupJobs", job._id, { updatedAt: 0 })
    )
    await t.mutation(internal.notebook.cleanup.recover, {})
    await t.mutation(internal.notebook.cleanup.process, { jobId: job._id })
    expect(
      await t.run((ctx) => ctx.db.get("notebookCleanupJobs", job._id))
    ).toBeNull()
    expect(
      (await t.run((ctx) => ctx.db.query("notebookPassages").take(30))).every(
        (row) => !row.snapshot
      )
    ).toBe(true)
    await t.mutation(internal.notebook.cleanup.process, { jobId: job._id })
  })
})
