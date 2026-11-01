/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { describe, it, expect } from "vitest"
import aggregateTest from "@convex-dev/aggregate/test"
import rateLimiterTest from "@convex-dev/rate-limiter/test"
import schema from "./schema"
import { api } from "./_generated/api"

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
const artistText = "Original technical lyrics"
describe("source-authorized sharing cards", () => {
  it("requires an active verified member, including direct preview/download calls", async () => {
    const { t, fan, song } = await setup()
    const target = { kind: "song" as const, sourceId: song }
    await expect(t.query(api.sharing.context, { target })).rejects.toThrow(
      "UNAUTHENTICATED"
    )
    await expect(
      t.query(api.sharing.prepare, {
        target,
        start: 0,
        end: 8,
        version: "forged",
        withArtwork: false,
      })
    ).rejects.toThrow("UNAUTHENTICATED")
    await t.run((ctx) =>
      ctx.db.patch("members", fan.id, { status: "suspended" })
    )
    await expect(
      fan.client.query(api.sharing.context, { target })
    ).rejects.toThrow("ACCOUNT_SUSPENDED")
    await t.run((ctx) =>
      ctx.db.patch("members", fan.id, {
        status: "active",
        emailVerified: false,
      })
    )
    await expect(
      fan.client.query(api.sharing.context, { target })
    ).rejects.toThrow("EMAIL_NOT_VERIFIED")
  })
  it("derives both source origins and returns only the exact selected text and managed artwork", async () => {
    const { t, artist, fan, song, community } = await setup()
    const imageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["test image"], { type: "image/png" }))
    )
    await t.run((ctx) =>
      ctx.db.patch("songs", song, { artworkStorageId: imageId })
    )
    for (const [client, sourceId, text] of [
      [fan.client, song, artistText],
      [artist.client, community, "Original fan test lyrics"],
    ] as const) {
      const target = { kind: "song" as const, sourceId }
      const context = await client.query(api.sharing.context, { target })
      expect(context?.state).toBe("ready")
      if (context?.state !== "ready") throw new Error("Fixture unavailable")
      expect(context.text).toBe(text)
      const card = await client.query(api.sharing.prepare, {
        target,
        version: context.version,
        start: 0,
        end: 8,
        withArtwork: true,
      })
      expect(card?.text).toBe("Original")
      expect(card?.artworkId).toBe(sourceId === song ? imageId : null)
      if (sourceId === song) expect(card?.artworkUrl).toBeTruthy()
      const plain = await client.query(api.sharing.prepare, {
        target,
        version: context.version,
        start: 0,
        end: 8,
        withArtwork: false,
      })
      expect(plain?.artworkUrl).toBeNull()
      expect(plain?.artworkId).toBeNull()
    }
  })
  it("keeps notebook targets private, including against administrators, and bounds selection to the saved passage", async () => {
    const { fan, other, admin, song } = await setup()
    const passageId = await fan.client.mutation(api.notebook.write.save, {
      sourceId: song,
      sourceText: artistText,
      start: 9,
      end: 18,
      collectionId: null,
    })
    const target = { kind: "passage" as const, passageId }
    const context = await fan.client.query(api.sharing.context, { target })
    if (context?.state !== "ready") throw new Error("Fixture unavailable")
    expect(context.text).toBe("technical")
    const args = {
      target,
      version: context.version,
      start: 0,
      end: 4,
      withArtwork: false,
    }
    expect((await fan.client.query(api.sharing.prepare, args))?.text).toBe(
      "tech"
    )
    await expect(
      fan.client.query(api.sharing.prepare, { ...args, end: 10 })
    ).rejects.toThrow("SHARE_RANGE")
    for (const client of [other.client, admin.client]) {
      await expect(
        client.query(api.sharing.context, { target })
      ).rejects.toThrow("NOT_FOUND")
      await expect(client.query(api.sharing.prepare, args)).rejects.toThrow(
        "NOT_FOUND"
      )
    }
    await fan.client.mutation(api.notebook.write.remove, { passageId })
    await expect(fan.client.query(api.sharing.prepare, args)).rejects.toThrow(
      "NOT_FOUND"
    )
  })
  it("requires reselecting the current source after editing a saved excerpt's version", async () => {
    const { t, fan, song } = await setup()
    const passageId = await fan.client.mutation(api.notebook.write.save, {
      sourceId: song,
      sourceText: artistText,
      start: 0,
      end: 8,
      collectionId: null,
    })
    const target = { kind: "passage" as const, passageId }
    const before = await fan.client.query(api.sharing.context, { target })
    if (before?.state !== "ready") throw new Error("Fixture unavailable")
    await t.run((ctx) =>
      ctx.db.patch("songs", song, { lyricsText: "Edited technical lyrics" })
    )
    expect(await fan.client.query(api.sharing.context, { target })).toEqual({
      state: "changed",
      href: `/songs/${song}`,
    })
    expect(
      await fan.client.query(api.sharing.prepare, {
        target,
        version: before.version,
        start: 0,
        end: 8,
        withArtwork: false,
      })
    ).toBeNull()
    const current = await fan.client.query(api.sharing.context, {
      target: { kind: "song", sourceId: song },
    })
    expect(current?.state).toBe("ready")
  })
  it("rechecks withdrawal and owner eligibility after preview for both origins", async () => {
    const { t, fan, song, community, artist } = await setup()
    for (const sourceId of [song, community]) {
      const target = { kind: "song" as const, sourceId }
      const context = await fan.client.query(api.sharing.context, { target })
      if (context?.state !== "ready") throw new Error("Fixture unavailable")
      const args = {
        target,
        version: context.version,
        start: 0,
        end: 8,
        withArtwork: true,
      }
      expect(await fan.client.query(api.sharing.prepare, args)).not.toBeNull()
      await t.run(async (ctx) => {
        if (sourceId === song)
          await ctx.db.patch("songs", song, { status: "draft" })
        else
          await ctx.db.patch("communityContributions", community, {
            status: "hidden",
          })
      })
      expect(await fan.client.query(api.sharing.context, { target })).toBeNull()
      expect(await fan.client.query(api.sharing.prepare, args)).toBeNull()
    }
    await t.run((ctx) => ctx.db.patch("songs", song, { status: "published" }))
    const context = await fan.client.query(api.sharing.context, {
      target: { kind: "song", sourceId: song },
    })
    if (context?.state !== "ready") throw new Error("Fixture unavailable")
    await t.run((ctx) =>
      ctx.db.patch("members", artist.id, { status: "suspended" })
    )
    expect(
      await fan.client.query(api.sharing.prepare, {
        target: { kind: "song", sourceId: song },
        version: context.version,
        start: 0,
        end: 8,
        withArtwork: false,
      })
    ).toBeNull()
  })
  it("rejects overlong, blank, fractional and split-Unicode ranges and stale versions", async () => {
    const { t, fan, song } = await setup()
    await t.run((ctx) =>
      ctx.db.patch("songs", song, { lyricsText: "😀\r\n" + "x".repeat(400) })
    )
    const target = { kind: "song" as const, sourceId: song }
    const context = await fan.client.query(api.sharing.context, { target })
    if (context?.state !== "ready") throw new Error("Fixture unavailable")
    const args = {
      target,
      version: context.version,
      start: 0,
      end: 2,
      withArtwork: false,
    }
    expect((await fan.client.query(api.sharing.prepare, args))?.text).toBe("😀")
    for (const [start, end] of [
      [0, 1],
      [1, 2],
      [0.5, 2],
      [-1, 1],
      [0, 361],
      [2, 4],
      [0, 999],
    ] as const)
      await expect(
        fan.client.query(api.sharing.prepare, { ...args, start, end })
      ).rejects.toThrow("SHARE_RANGE")
    expect(
      await fan.client.query(api.sharing.prepare, {
        ...args,
        version: "forged",
      })
    ).toBeNull()
  })
})
