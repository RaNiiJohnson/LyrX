/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, describe, expect, it, vi } from "vitest"
import rateLimiterTest from "@convex-dev/rate-limiter/test"
import { api, internal } from "./_generated/api"
import schema from "./schema"
import * as imageValidation from "./lib/catalogueImages"

const modules = import.meta.glob("./**/*.ts")
function backend() {
  const t = convexTest(schema, modules)
  rateLimiterTest.register(t)
  return t
}
async function member(
  t: ReturnType<typeof backend>,
  name: string,
  admin = false
) {
  const client = t.withIdentity({
    tokenIdentifier: `https://issuer.example|${name}`,
    subject: name,
    issuer: "https://issuer.example",
    email: `${name}@example.com`,
    emailVerified: true,
  })
  const { memberId } = await client.mutation(api.members.completeOnboarding, {
    role: "fan",
    handle: name,
    displayName: name,
  })
  if (admin)
    await t.run((ctx) => ctx.db.patch("members", memberId, { isAdmin: true }))
  return { client, memberId }
}
const input = {
  title: "Community song",
  primaryArtist: "Artist",
  lyricsText: "Raw\r\n\nlyrics  ",
  requestId: "publish-one",
}
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("community follow-up", () => {
  it("accepts blank optional form fields without requiring a custom genre", async () => {
    const t = backend(),
      fan = await member(t, "blank-metadata")
    const { requestId: _requestId, ...fields } = input
    const formInput = {
      ...fields,
      albumTitle: "",
      description: "",
      context: "",
      label: "",
      otherGenre: "",
      guestArtists: [],
      writers: [],
      composers: [],
      producers: [],
      additionalCredits: [],
      listeningLinks: [],
    }
    const id = await fan.client.mutation(api.community.write.publish, {
      ...formInput,
      requestId: input.requestId,
    })
    await fan.client.mutation(api.community.write.update, {
      ...formInput,
      contributionId: id,
      expectedRevision: 1,
      genre: "hip-hop",
      clearReleaseDate: true,
    })
    const row = await fan.client.query(api.community.read.getMine, {
      contributionId: id,
    })
    expect(row.genre).toBe("hip-hop")
    expect(row).not.toHaveProperty("otherGenre")
    expect(row).not.toHaveProperty("releaseDate")
    expect(row.lyricsText).toBe(input.lyricsText)
  })

  it("blocks catalogue registration and profile attachment of a community-owned storage object", async () => {
    const t = backend(),
      owner = await member(t, "community-image-owner"),
      artist = await member(t, "community-image-attacker")
    const contributionId = await owner.client.mutation(
      api.community.write.publish,
      input
    )
    const songId = await t.run(async (ctx) => {
      await ctx.db.patch("members", artist.memberId, { role: "artist" })
      return ctx.db.insert("songs", {
        ownerMemberId: artist.memberId,
        status: "draft",
        title: "Official fixture",
        primaryArtist: "Artist",
        guestArtists: [],
        writers: [],
        composers: [],
        producers: [],
        listeningLinks: [],
        lyricsText: "Official lyrics",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })
    const upload = await artist.client.mutation(
      api.catalogue.artwork.generateArtworkUploadUrl,
      {
        resource: { kind: "song", id: songId },
      }
    )
    const profileUpload = await artist.client.mutation(
      api.members.generateProfileImageUploadUrl,
      { kind: "avatar" }
    )
    const storageId = await t.run(async (ctx) => {
      const file = await ctx.storage.store(
        new Blob(["community-cover"], { type: "image/png" })
      )
      await ctx.db.insert("communityImages", {
        authorMemberId: owner.memberId,
        contributionId,
        storageId: file,
        createdAt: Date.now(),
      })
      return file
    })
    await expect(
      artist.client.mutation(api.catalogue.artwork.registerArtworkUpload, {
        resource: { kind: "song", id: songId },
        intentId: upload.intentId,
        storageId,
      })
    ).rejects.toThrow("IMAGE_ALREADY_ATTACHED")
    await expect(
      artist.client.mutation(api.members.saveProfileImage, {
        kind: "avatar",
        storageId,
        uploadIntentId: profileUpload.uploadIntentId,
      })
    ).rejects.toThrow("PROFILE_IMAGE_FORBIDDEN")
    expect(
      await t.run((ctx) => ctx.db.system.get("_storage", storageId))
    ).not.toBeNull()
    expect(
      await t.run((ctx) => ctx.db.get("songs", songId))
    ).not.toHaveProperty("artworkStorageId")
    expect(await t.run((ctx) => ctx.db.query("profileImages").take(1))).toEqual(
      []
    )
  })

  it("preserves both independent community storage claims during the global orphan sweep", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    const t = backend(),
      owner = await member(t, "community-sweep")
    const contributionId = await owner.client.mutation(
      api.community.write.publish,
      input
    )
    const files = await t.run(async (ctx) => {
      const imageClaim = await ctx.storage.store(new Blob(["image-claim-only"]))
      const contributionClaim = await ctx.storage.store(
        new Blob(["contribution-claim-only"])
      )
      const orphan = await ctx.storage.store(new Blob(["unclaimed"]))
      await ctx.db.insert("communityImages", {
        authorMemberId: owner.memberId,
        contributionId,
        storageId: imageClaim,
        createdAt: Date.now(),
      })
      await ctx.db.patch("communityContributions", contributionId, {
        artworkStorageId: contributionClaim,
      })
      return { imageClaim, contributionClaim, orphan }
    })
    vi.advanceTimersByTime(11 * 60 * 1000)
    await t.mutation(internal.catalogue.artwork.sweepUnclaimedStorage, {})
    await t.run(async (ctx) => {
      expect(
        await ctx.db.system.get("_storage", files.imageClaim)
      ).not.toBeNull()
      expect(
        await ctx.db.system.get("_storage", files.contributionClaim)
      ).not.toBeNull()
      expect(await ctx.db.system.get("_storage", files.orphan)).toBeNull()
    })
  })
  it("rejects self-reporting on the server without creating a report", async () => {
    const t = backend(),
      fan = await member(t, "self-report")
    const contributionId = await fan.client.mutation(
      api.community.write.publish,
      input
    )
    await expect(
      fan.client.mutation(api.community.moderation.report, {
        contributionId,
        reason: "My own post",
      })
    ).rejects.toThrow("SELF_REPORT_FORBIDDEN")
    expect(
      await t.run((ctx) => ctx.db.query("communityReports").take(1))
    ).toEqual([])
  })

  it("accepts optional song metadata, preserves it for old clients and never exposes private fields", async () => {
    const t = backend(),
      fan = await member(t, "metadata-owner")
    const metadata = {
      guestArtists: ["Guest"],
      releaseDate: 1_700_000_000_000,
      description: " Description ",
      context: "Context",
      genre: "other" as const,
      otherGenre: "Custom genre",
      writers: ["Writer"],
      composers: ["Composer"],
      producers: ["Producer"],
      label: "Label",
      additionalCredits: ["Cover by artist"],
      listeningLinks: [
        { provider: "youtube" as const, url: "https://youtu.be/test" },
      ],
    }
    const contributionId = await fan.client.mutation(
      api.community.write.publish,
      { ...input, ...metadata }
    )
    const { requestId: _requestId, ...legacy } = input
    await fan.client.mutation(api.community.write.update, {
      ...legacy,
      contributionId,
      expectedRevision: 1,
    })
    const row = await t.query(api.community.read.getPublished, {
      contributionId,
    })
    expect(row).toMatchObject({
      ...metadata,
      description: "Description",
      artworkUrl: null,
      lyricsText: input.lyricsText,
      revision: 2,
    })
    expect(row).not.toHaveProperty("authorMemberId")
    expect(row).not.toHaveProperty("artworkStorageId")
    expect(
      await fan.client.query(api.community.read.getMine, { contributionId })
    ).toHaveProperty("artworkUrl", null)
    await fan.client.mutation(api.community.write.update, {
      ...legacy,
      contributionId,
      expectedRevision: 2,
      description: "",
      guestArtists: [],
    })
    expect(
      await t.query(api.community.read.getPublished, { contributionId })
    ).toMatchObject({ guestArtists: [], genre: "other" })
    expect(
      await t.query(api.community.read.getPublished, { contributionId })
    ).not.toHaveProperty("description")
    await fan.client.mutation(api.community.write.update, {
      ...legacy,
      contributionId,
      expectedRevision: 3,
      genre: "pop",
    })
    expect(
      await t.query(api.community.read.getPublished, { contributionId })
    ).not.toHaveProperty("otherGenre")
    await fan.client.mutation(api.community.write.update, {
      ...legacy,
      contributionId,
      expectedRevision: 4,
      clearGenre: true,
      clearReleaseDate: true,
    })
    const cleared = await t.query(api.community.read.getPublished, {
      contributionId,
    })
    expect(cleared).not.toHaveProperty("genre")
    expect(cleared).not.toHaveProperty("releaseDate")
    expect(cleared).not.toHaveProperty("clearGenre")
  })

  it("keeps pre-existing contributions readable without metadata and rejects invalid dates, genres, lists and provider URLs", async () => {
    const t = backend(),
      fan = await member(t, "metadata-legacy")
    const contributionId = await t.run((ctx) =>
      ctx.db.insert("communityContributions", {
        ...input,
        authorMemberId: fan.memberId,
        status: "published",
        revision: 1,
        firstPublishedAt: 1,
        updatedAt: 1,
      })
    )
    expect(
      await t.query(api.community.read.getPublished, { contributionId })
    ).toMatchObject({ artworkUrl: null, title: input.title })
    for (const invalid of [
      { releaseDate: 1.25 },
      { genre: "other" as const },
      { genre: "pop" as const, otherGenre: "Unexpected" },
      { guestArtists: Array.from({ length: 21 }, () => "Guest") },
      { description: "x".repeat(2001) },
      {
        listeningLinks: [
          { provider: "youtube" as const, url: "https://evil.example/clip" },
        ],
      },
      {
        listeningLinks: [
          { provider: "other" as const, url: "javascript:alert(1)" },
        ],
      },
    ])
      await expect(
        fan.client.mutation(api.community.write.publish, {
          ...input,
          ...invalid,
        })
      ).rejects.toThrow()
  })

  it("restores only hidden reported contributions, audits concurrent retries and preserves the original decision and first publication date", async () => {
    const t = backend(),
      fan = await member(t, "restore-owner"),
      admin = await member(t, "restore-admin", true)
    const contributionId = await fan.client.mutation(
      api.community.write.publish,
      input
    )
    const before = await fan.client.query(api.community.read.getMine, {
      contributionId,
    })
    const reportId = await admin.client.mutation(
      api.community.moderation.report,
      { contributionId, reason: "Review" }
    )
    const args = {
      reportId,
      reason: "No longer warrants hiding",
      expectedRevision: 1,
      requestId: "restore-one",
    }
    await expect(
      t.mutation(api.community.moderation.restore, args)
    ).rejects.toThrow("UNAUTHENTICATED")
    const forged = { ...args, moderatorMemberId: fan.memberId }
    await expect(
      admin.client.mutation(api.community.moderation.restore, forged)
    ).rejects.toThrow("moderatorMemberId")
    await expect(
      fan.client.mutation(api.community.moderation.restore, args)
    ).rejects.toThrow("FORBIDDEN")
    await expect(
      admin.client.mutation(api.community.moderation.restore, args)
    ).rejects.toThrow("RESTORATION_FORBIDDEN")
    await admin.client.mutation(api.community.moderation.resolve, {
      reportId,
      action: "hide",
      reason: "Initial hide",
      expectedRevision: 1,
    })
    await expect(
      admin.client.mutation(api.community.moderation.restore, {
        ...args,
        reason: " ",
      })
    ).rejects.toThrow("INVALID_INPUT")
    await expect(
      admin.client.mutation(api.community.moderation.restore, {
        ...args,
        expectedRevision: 0,
      })
    ).rejects.toThrow("REVISION_CONFLICT")
    await Promise.all([
      admin.client.mutation(api.community.moderation.restore, args),
      admin.client.mutation(api.community.moderation.restore, args),
    ])
    const restored = await admin.client.query(
      api.community.moderation.getReport,
      { reportId }
    )
    expect(restored).toMatchObject({
      contribution: {
        status: "published",
        revision: 2,
        firstPublishedAt: before.firstPublishedAt,
      },
      decision: { action: "hide", reason: "Initial hide" },
      latestRestoration: {
        reason: args.reason,
        moderatorMemberId: admin.memberId,
        reviewedRevision: 1,
      },
    })
    expect(
      await t.run((ctx) => ctx.db.query("communityRestorations").take(5))
    ).toHaveLength(1)
    expect(
      await t.query(api.community.read.getPublished, { contributionId })
    ).not.toBeNull()
    // A retry must not reverse a later removal.
    await t.run((ctx) =>
      ctx.db.patch("communityContributions", contributionId, {
        status: "removed",
      })
    )
    await admin.client.mutation(api.community.moderation.restore, args)
    expect(
      await t.query(api.community.read.getPublished, { contributionId })
    ).toBeNull()
    await expect(
      admin.client.mutation(api.community.moderation.restore, {
        ...args,
        requestId: "restore-two",
        expectedRevision: 2,
      })
    ).rejects.toThrow("RESTORATION_FORBIDDEN")
  })

  it.each(["suspended", "deleted", "missing"] as const)(
    "never restores content from a %s author",
    async (state) => {
      const t = backend(),
        fan = await member(t, "unavailable-owner"),
        admin = await member(t, "unavailable-admin", true)
      const contributionId = await fan.client.mutation(
        api.community.write.publish,
        input
      )
      const reportId = await admin.client.mutation(
        api.community.moderation.report,
        { contributionId, reason: "Review" }
      )
      await admin.client.mutation(api.community.moderation.resolve, {
        reportId,
        action: "hide",
        reason: "Hide",
        expectedRevision: 1,
      })
      await t.run(async (ctx) => {
        if (state === "suspended")
          await ctx.db.patch("members", fan.memberId, { status: "suspended" })
        if (state === "missing") await ctx.db.delete("members", fan.memberId)
        if (state === "deleted")
          await ctx.db.insert("accountDeletions", {
            authUserId: "https://issuer.example|unavailable-owner",
            requestedAt: Date.now(),
          })
      })
      await expect(
        admin.client.mutation(api.community.moderation.restore, {
          reportId,
          reason: "Try restore",
          expectedRevision: 1,
          requestId: "no",
        })
      ).rejects.toThrow("RESTORATION_FORBIDDEN")
    }
  )

  it("protects artwork upload ownership and resource status, validates metadata and expires intents", async () => {
    const t = backend(),
      owner = await member(t, "artwork-owner"),
      other = await member(t, "artwork-other")
    const contributionId = await owner.client.mutation(
      api.community.write.publish,
      input
    )
    await expect(
      other.client.mutation(api.community.artwork.generateArtworkUploadUrl, {
        contributionId,
      })
    ).rejects.toThrow("NOT_FOUND")
    const upload = await owner.client.mutation(
      api.community.artwork.generateArtworkUploadUrl,
      { contributionId }
    )
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["invalid"], { type: "text/plain" }))
    )
    await expect(
      other.client.mutation(api.community.artwork.saveArtwork, {
        contributionId,
        intentId: upload.intentId,
        storageId,
      })
    ).rejects.toThrow("NOT_FOUND")
    await expect(
      owner.client.mutation(api.community.artwork.saveArtwork, {
        contributionId,
        intentId: upload.intentId,
        storageId,
      })
    ).rejects.toThrow("INVALID_IMAGE")
    expect(
      await t.run((ctx) => ctx.db.system.get("_storage", storageId))
    ).not.toBeNull()
    await t.run((ctx) =>
      ctx.db.patch("communityArtworkUploadIntents", upload.intentId, {
        expiresAt: 0,
      })
    )
    await expect(
      owner.client.mutation(api.community.artwork.saveArtwork, {
        contributionId,
        intentId: upload.intentId,
        storageId,
      })
    ).rejects.toThrow("INVALID_UPLOAD_INTENT")
    await t.mutation(internal.community.artwork.expireArtworkUploadIntent, {
      intentId: upload.intentId,
    })
    expect(
      await t.run((ctx) =>
        ctx.db.get("communityArtworkUploadIntents", upload.intentId)
      )
    ).toBeNull()
    await t.run((ctx) =>
      ctx.db.patch("communityContributions", contributionId, {
        status: "hidden",
      })
    )
    await expect(
      owner.client.mutation(api.community.artwork.generateArtworkUploadUrl, {
        contributionId,
      })
    ).rejects.toThrow("CONTRIBUTION_MODERATED")
  })

  it("atomically claims artwork, exposes its URL and replaces only unreferenced owned storage", async () => {
    const t = backend(),
      owner = await member(t, "artwork-save")
    const contributionId = await owner.client.mutation(
      api.community.write.publish,
      input
    )
    const before = await owner.client.query(api.community.read.getMine, {
      contributionId,
    })
    const validate = imageValidation.isValidCatalogueImageMetadata
    // convex-test drops Blob MIME; supply that missing metadata only, retaining
    // real size/time validation. Live upload must verify MIME separately.
    vi.spyOn(
      imageValidation,
      "isValidCatalogueImageMetadata"
    ).mockImplementation((metadata, createdAt) =>
      validate({ ...metadata, contentType: "image/png" }, createdAt)
    )
    const upload = await owner.client.mutation(
      api.community.artwork.generateArtworkUploadUrl,
      { contributionId }
    )
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["first"], { type: "image/png" }))
    )
    await owner.client.mutation(api.community.artwork.saveArtwork, {
      contributionId,
      intentId: upload.intentId,
      storageId,
    })
    expect(
      await t.query(api.community.read.getPublished, { contributionId })
    ).toMatchObject({
      artworkUrl: expect.any(String),
      revision: 2,
      firstPublishedAt: before.firstPublishedAt,
    })
    const reservedAgain = await owner.client.mutation(
      api.community.artwork.generateArtworkUploadUrl,
      { contributionId }
    )
    await expect(
      owner.client.mutation(api.community.artwork.saveArtwork, {
        contributionId,
        intentId: reservedAgain.intentId,
        storageId,
      })
    ).rejects.toThrow("IMAGE_ALREADY_ATTACHED")
    expect(
      await t.run((ctx) =>
        ctx.db.get("communityArtworkUploadIntents", upload.intentId)
      )
    ).toBeNull()
    await owner.client.mutation(api.community.artwork.saveArtwork, {
      contributionId,
      intentId: upload.intentId,
      storageId,
    })
    expect(
      await owner.client.query(api.community.read.getMine, { contributionId })
    ).toMatchObject({ revision: 2, artworkStorageId: storageId })
    const unrelatedStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["unrelated"]))
    )
    await expect(
      owner.client.mutation(api.community.artwork.saveArtwork, {
        contributionId,
        intentId: upload.intentId,
        storageId: unrelatedStorageId,
      })
    ).rejects.toThrow("INVALID_UPLOAD_INTENT")
    // A global foreign claim must preserve the first file during replacement.
    await t.run((ctx) =>
      ctx.db.insert("profileImages", {
        memberId: owner.memberId,
        storageId,
        kind: "avatar",
        createdAt: Date.now(),
      })
    )
    const next = await owner.client.mutation(
      api.community.artwork.generateArtworkUploadUrl,
      { contributionId }
    )
    const nextStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["second"], { type: "image/png" }))
    )
    await owner.client.mutation(api.community.artwork.saveArtwork, {
      contributionId,
      intentId: next.intentId,
      storageId: nextStorageId,
    })
    expect(
      await t.run((ctx) => ctx.db.system.get("_storage", storageId))
    ).not.toBeNull()
    expect(
      await t.run((ctx) => ctx.db.query("communityImages").take(5))
    ).toMatchObject([{ storageId: nextStorageId }])
    const final = await owner.client.mutation(
      api.community.artwork.generateArtworkUploadUrl,
      { contributionId }
    )
    const finalStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["third"], { type: "image/png" }))
    )
    await owner.client.mutation(api.community.artwork.saveArtwork, {
      contributionId,
      intentId: final.intentId,
      storageId: finalStorageId,
    })
    expect(
      await t.run((ctx) => ctx.db.system.get("_storage", nextStorageId))
    ).toBeNull()
  })

  it("rejects images claimed across domains, old files, mismatched and oversize uploads without deleting them", async () => {
    const t = backend(),
      owner = await member(t, "artwork-security"),
      other = await member(t, "artwork-victim")
    const contributionId = await owner.client.mutation(
      api.community.write.publish,
      input
    )
    const oldStorage = await t.run((ctx) =>
      ctx.storage.store(new Blob(["old"]))
    )
    const upload = await owner.client.mutation(
      api.community.artwork.generateArtworkUploadUrl,
      { contributionId }
    )
    await t.run((ctx) =>
      ctx.db.patch("communityArtworkUploadIntents", upload.intentId, {
        createdAt: Date.now() + 1000,
      })
    )
    await expect(
      owner.client.mutation(api.community.artwork.saveArtwork, {
        contributionId,
        intentId: upload.intentId,
        storageId: oldStorage,
      })
    ).rejects.toThrow("INVALID_IMAGE")
    await t.run((ctx) =>
      ctx.db.insert("profileImages", {
        memberId: other.memberId,
        storageId: oldStorage,
        kind: "avatar",
        createdAt: Date.now(),
      })
    )
    await expect(
      owner.client.mutation(api.community.artwork.saveArtwork, {
        contributionId,
        intentId: upload.intentId,
        storageId: oldStorage,
      })
    ).rejects.toThrow("IMAGE_ALREADY_ATTACHED")
    const secondId = await owner.client.mutation(api.community.write.publish, {
      ...input,
      requestId: "two",
    })
    await expect(
      owner.client.mutation(api.community.artwork.saveArtwork, {
        contributionId: secondId,
        intentId: upload.intentId,
        storageId: oldStorage,
      })
    ).rejects.toThrow("INVALID_UPLOAD_INTENT")
    expect(
      await t.run((ctx) => ctx.db.system.get("_storage", oldStorage))
    ).not.toBeNull()
    expect(
      imageValidation.isValidCatalogueImageMetadata(
        {
          _creationTime: 2,
          contentType: "image/png",
          size: 10 * 1024 * 1024 + 1,
        },
        1
      )
    ).toBe(false)
  })
})
