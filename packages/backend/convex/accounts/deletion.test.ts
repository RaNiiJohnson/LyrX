import aggregateTest from "@convex-dev/aggregate/test"
import { convexTest } from "convex-test"
import { describe, expect, it, vi } from "vitest"

import { internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import {
  albumTracksByAlbum,
  albumsByOwner,
  albumsByOwnerAndStatus,
  catalogueAggregateTriggers,
  songsByOwner,
  songsByOwnerAndStatus,
} from "../catalogue/aggregates"
import schema from "../schema"
import { beginAccountDeletion } from "./deletion"

const modules = {
  "../_generated/server.ts": () => import("../_generated/server"),
  "../accounts/deletion.ts": () => import("./deletion"),
  "../discovery/maintenance.ts": () => import("../discovery/maintenance"),
}

function first<T>(items: ReadonlyArray<T>): T {
  const item = items[0]
  if (item === undefined) throw new Error("Expected a non-empty fixture")
  return item
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

async function seed(t: ReturnType<typeof backend>, name: string, count = 1) {
  return t.run(async (rawCtx) => {
    const ctx = catalogueAggregateTriggers.wrapDB(rawCtx)
    const memberId = await ctx.db.insert("members", {
      authUserId: `issuer|${name}`,
      email: `${name}@example.com`,
      emailVerified: true,
      role: "artist",
      status: "active",
      isAdmin: false,
      createdAt: 1,
      updatedAt: 1,
    })
    const profileId = await ctx.db.insert("profiles", {
      memberId,
      handle: name,
      handleNormalized: name,
      displayName: name,
      createdAt: 1,
      updatedAt: 1,
    })
    await ctx.db.insert("artistProfiles", {
      memberId,
      customLinks: [],
      createdAt: 1,
      updatedAt: 1,
    })
    const songIds: Array<Id<"songs">> = []
    const albumIds: Array<Id<"albums">> = []
    for (let i = 0; i < count; i++) {
      const songId = await ctx.db.insert("songs", {
        ownerMemberId: memberId,
        status: "published",
        title: `Song ${i}`,
        primaryArtist: name,
        guestArtists: [],
        writers: [],
        composers: [],
        producers: [],
        listeningLinks: [],
        lyricsText: "Original lyrics",
        createdAt: 1,
        updatedAt: 1,
      })
      const albumId = await ctx.db.insert("albums", {
        ownerMemberId: memberId,
        status: "published",
        title: `Album ${i}`,
        credits: [],
        createdAt: 1,
        updatedAt: 1,
      })
      await ctx.db.insert("albumTracks", {
        ownerMemberId: memberId,
        songId,
        albumId,
        position: 0,
        createdAt: 1,
        updatedAt: 1,
      })
      songIds.push(songId)
      albumIds.push(albumId)
    }
    return { memberId, profileId, songIds, albumIds }
  })
}

async function drain(
  t: ReturnType<typeof backend>,
  jobId: Id<"accountDeletionJobs">
) {
  for (let i = 0; i < 250; i++) {
    if (!(await t.run((ctx) => ctx.db.get("accountDeletionJobs", jobId))))
      return i
    await t.mutation(internal.accounts.deletion.processBatch, { jobId })
  }
  throw new Error("Deletion did not finish within bounded fixture steps")
}

describe("account deletion cascade", () => {
  it("removes publications and their legacy children in bounded batches, with transactional aggregates", async () => {
    vi.useFakeTimers()
    try {
      const t = backend()
      const owner = await seed(t, "owner", 27)
      const other = await seed(t, "other")
      const songId = first(owner.songIds)
      const legacySection = await t.run(async (ctx) => {
        const sectionId = await ctx.db.insert("songSections", {
          songId,
          kind: "verse",
          position: 0,
          createdAt: 1,
          updatedAt: 1,
        })
        for (let i = 0; i < 51; i++) {
          await ctx.db.insert("lyricLines", {
            songId,
            sectionId,
            text: `Line ${i}`,
            position: i,
            createdAt: 1,
            updatedAt: 1,
          })
          await ctx.db.insert("songSections", {
            songId,
            kind: "verse",
            position: i + 1,
            createdAt: 1,
            updatedAt: 1,
          })
        }
        return sectionId
      })
      await t.run((ctx) => beginAccountDeletion(ctx, "issuer|owner"))
      const job = await t.run((ctx) =>
        ctx.db.query("accountDeletionJobs").first()
      )
      expect(job).not.toBeNull()
      expect(
        await t.run((ctx) => ctx.db.get("members", owner.memberId))
      ).toMatchObject({ status: "suspended" })
      await t.mutation(internal.accounts.deletion.processBatch, {
        jobId: job!._id,
      })
      expect(
        await t.run((ctx) =>
          ctx.db
            .query("lyricLines")
            .withIndex("by_song_id", (q) => q.eq("songId", songId))
            .take(60)
        )
      ).toHaveLength(26)
      expect(
        await t.run((ctx) => ctx.db.get("songSections", legacySection))
      ).not.toBeNull()
      expect(await drain(t, job!._id)).toBeGreaterThan(25)
      for (const table of [
        "songs",
        "albums",
        "albumTracks",
        "members",
        "profiles",
        "artistProfiles",
      ] as const) {
        const rows = await t.run((ctx) => ctx.db.query(table).take(60))
        expect(rows).toHaveLength(1)
      }
      expect(
        await t.run((ctx) => ctx.db.query("lyricLines").take(1))
      ).toHaveLength(0)
      expect(
        await t.run((ctx) => ctx.db.query("songSections").take(1))
      ).toHaveLength(0)
      await t.run(async (ctx) => {
        expect(
          await songsByOwner.count(ctx, { namespace: owner.memberId })
        ).toBe(0)
        expect(
          await albumsByOwner.count(ctx, { namespace: owner.memberId })
        ).toBe(0)
        expect(
          await songsByOwnerAndStatus.count(ctx, {
            namespace: [owner.memberId, "published"],
          })
        ).toBe(0)
        expect(
          await albumsByOwnerAndStatus.count(ctx, {
            namespace: [owner.memberId, "published"],
          })
        ).toBe(0)
        expect(
          await songsByOwner.count(ctx, { namespace: other.memberId })
        ).toBe(1)
        expect(
          await albumTracksByAlbum.count(ctx, {
            namespace: first(owner.albumIds),
          })
        ).toBe(0)
        expect(
          await albumTracksByAlbum.count(ctx, {
            namespace: first(other.albumIds),
          })
        ).toBe(1)
      })
      await expect(
        t.mutation(internal.accounts.deletion.processBatch, { jobId: job!._id })
      ).resolves.toBeNull()
      await t.finishAllScheduledFunctions(() => vi.runAllTimers())
    } finally {
      vi.useRealTimers()
    }
  })

  it("cleans owned image claims and intents but preserves any other account's file reference", async () => {
    vi.useFakeTimers()
    try {
      const t = backend()
      const owner = await seed(t, "image-owner")
      const other = await seed(t, "image-other")
      const files = await t.run(async (ctx) => {
        const deletedFiles: Array<Id<"_storage">> = []
        const sharedFile = await ctx.storage.store(new Blob(["shared"]))
        const otherFile = await ctx.storage.store(new Blob(["other"]))
        await ctx.db.insert("profileImages", {
          memberId: owner.memberId,
          storageId: sharedFile,
          kind: "avatar",
          createdAt: 1,
        })
        await ctx.db.patch("profiles", other.profileId, {
          avatarStorageId: sharedFile,
        })
        await ctx.db.insert("catalogueImages", {
          ownerMemberId: other.memberId,
          storageId: otherFile,
          kind: "song",
          createdAt: 1,
        })
        for (let i = 0; i < 27; i++) {
          const storageId = await ctx.storage.store(new Blob([`image ${i}`]))
          const intentStorage = await ctx.storage.store(
            new Blob([`upload ${i}`])
          )
          deletedFiles.push(storageId, intentStorage)
          await ctx.db.insert("profileImages", {
            memberId: owner.memberId,
            storageId,
            kind: i % 2 ? "avatar" : "banner",
            createdAt: 1,
          })
          await ctx.db.insert("catalogueImages", {
            ownerMemberId: owner.memberId,
            storageId,
            kind: i % 2 ? "song" : "album",
            createdAt: 1,
          })
          await ctx.db.insert("profileImageUploadIntents", {
            memberId: owner.memberId,
            kind: "avatar",
            createdAt: 1,
            expiresAt: Date.now() + 60_000,
          })
          await ctx.db.insert("catalogueImageUploadIntents", {
            ownerMemberId: owner.memberId,
            kind: "song",
            resourceId: first(owner.songIds),
            storageId: intentStorage,
            createdAt: 1,
            expiresAt: Date.now() + 60_000,
          })
        }
        await ctx.db.patch("songs", first(owner.songIds), {
          artworkStorageId: deletedFiles[0],
        })
        await ctx.db.patch("albums", first(owner.albumIds), {
          artworkStorageId: deletedFiles[0],
        })
        await ctx.db.patch("profiles", owner.profileId, {
          avatarStorageId: deletedFiles[0],
        })
        return { deletedFiles, sharedFile, otherFile }
      })
      const { deletedFiles, sharedFile, otherFile } = files
      await t.run((ctx) => beginAccountDeletion(ctx, "issuer|image-owner"))
      const job = await t.run((ctx) =>
        ctx.db.query("accountDeletionJobs").first()
      )
      await drain(t, job!._id)
      await t.run(async (ctx) => {
        for (const id of deletedFiles)
          expect(await ctx.db.system.get("_storage", id)).toBeNull()
        expect(await ctx.db.system.get("_storage", sharedFile)).not.toBeNull()
        expect(await ctx.db.system.get("_storage", otherFile)).not.toBeNull()
        expect(await ctx.db.query("profileImages").take(1)).toHaveLength(0)
        expect(await ctx.db.query("catalogueImages").take(2)).toHaveLength(1)
        expect(
          await ctx.db.query("profileImageUploadIntents").take(1)
        ).toHaveLength(0)
        expect(
          await ctx.db.query("catalogueImageUploadIntents").take(1)
        ).toHaveLength(0)
      })
      await t.finishAllScheduledFunctions(() => vi.runAllTimers())
    } finally {
      vi.useRealTimers()
    }
  })

  it("is idempotent and recovers stalled jobs without touching unrelated members", async () => {
    vi.useFakeTimers()
    try {
      const t = backend()
      const owner = await seed(t, "retry-owner")
      const other = await seed(t, "retry-other")
      await t.run(async (ctx) => {
        await beginAccountDeletion(ctx, "issuer|retry-owner")
        await beginAccountDeletion(ctx, "issuer|retry-owner")
        const job = await ctx.db.query("accountDeletionJobs").first()
        await ctx.db.patch("accountDeletionJobs", job!._id, { updatedAt: 0 })
        // Simulate a lost/failed scheduled callback. Only the recovery cron's
        // new callback can now finish this job.
        const callbacks = await ctx.db.system
          .query("_scheduled_functions")
          .take(10)
        for (const callback of callbacks)
          await ctx.scheduler.cancel(callback._id)
      })
      expect(
        await t.run((ctx) => ctx.db.query("accountDeletions").take(2))
      ).toHaveLength(1)
      expect(
        await t.run((ctx) => ctx.db.query("accountDeletionJobs").take(2))
      ).toHaveLength(1)
      await t.mutation(internal.accounts.deletion.resumeStalledJobs, {})
      const resumed = await t.run((ctx) =>
        ctx.db.query("accountDeletionJobs").first()
      )
      expect(resumed!.updatedAt).toBe(Date.now())
      await t.finishAllScheduledFunctions(() => vi.runAllTimers())
      expect(
        await t.run((ctx) => ctx.db.get("members", owner.memberId))
      ).toBeNull()
      expect(
        await t.run((ctx) => ctx.db.get("members", other.memberId))
      ).toMatchObject({ status: "active" })
      await t.run((ctx) => beginAccountDeletion(ctx, "issuer|retry-owner"))
      expect(
        await t.run((ctx) => ctx.db.query("accountDeletionJobs").take(1))
      ).toHaveLength(0)
      expect(
        await t.run((ctx) => ctx.db.query("accountDeletions").take(2))
      ).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it("revokes a deleted auth identity even when onboarding never created a member", async () => {
    const t = backend()
    await t.run((ctx) => beginAccountDeletion(ctx, "issuer|unonboarded"))
    await t.run((ctx) => beginAccountDeletion(ctx, "issuer|unonboarded"))
    expect(
      await t.run((ctx) => ctx.db.query("accountDeletions").take(2))
    ).toMatchObject([{ authUserId: "issuer|unonboarded" }])
    expect(
      await t.run((ctx) => ctx.db.query("accountDeletionJobs").take(1))
    ).toHaveLength(0)
  })
})
