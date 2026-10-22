/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { describe, expect, it, vi } from "vitest"
import rateLimiterTest from "@convex-dev/rate-limiter/test"

import { api, internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import schema from "./schema"
import {
  isValidCatalogueImageMetadata,
  MAX_CATALOGUE_IMAGE_BYTES,
} from "./lib/catalogueImages"

const modules = import.meta.glob("./**/*.ts")

const identity = (name: string) => ({
  tokenIdentifier: `https://issuer.example|${name}`,
  subject: name,
  issuer: "https://issuer.example",
  email: `${name}@example.com`,
  emailVerified: true,
})

function backend() {
  const t = convexTest(schema, modules)
  rateLimiterTest.register(t)
  return t
}

function expectDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

async function artist(t: ReturnType<typeof backend>, name: string) {
  const client = t.withIdentity(identity(name))
  const created = await client.mutation(api.members.completeOnboarding, {
    role: "artist",
    handle: name,
    displayName: name,
  })
  return { client, memberId: created.memberId }
}

const songInput = (title: string) => ({
  title,
  primaryArtist: "Rija",
  guestArtists: ["Aina"],
  primaryLanguage: "mg",
  genre: "other" as const,
  otherGenre: "Salegy moderne",
  writers: ["Rija"],
  composers: ["Rija"],
  producers: [],
  listeningLinks: [
    { provider: "spotify" as const, url: "https://open.spotify.com/track/1" },
  ],
  sections: [
    {
      kind: "verse" as const,
      lines: [{ text: "Andalana voalohany" }, { text: "Andalana faharoa" }],
    },
  ],
})

describe("artist catalogue", () => {
  it("accepts supported artwork metadata and rejects MIME or size violations", () => {
    expect(
      isValidCatalogueImageMetadata(
        { _creationTime: 2, contentType: "image/png", size: 128 },
        1
      )
    ).toBe(true)
    expect(
      isValidCatalogueImageMetadata(
        { _creationTime: 2, contentType: "text/plain", size: 128 },
        1
      )
    ).toBe(false)
    expect(
      isValidCatalogueImageMetadata(
        {
          _creationTime: 2,
          contentType: "image/webp",
          size: MAX_CATALOGUE_IMAGE_BYTES + 1,
        },
        1
      )
    ).toBe(false)
  })
  it("denies anonymous, fan and suspended accounts", async () => {
    const t = backend()
    await expect(
      t.query(api.catalogue.listMySongs, {
        paginationOpts: { numItems: 24, cursor: null },
      })
    ).rejects.toThrow("connexion")
    const fan = t.withIdentity(identity("fan-catalogue"))
    await fan.mutation(api.members.completeOnboarding, {
      role: "fan",
      handle: "fan-catalogue",
      displayName: "Fan",
    })
    await expect(
      fan.mutation(api.catalogue.createSong, songInput("Interdit"))
    ).rejects.toThrow("artiste")

    const suspended = await artist(t, "suspended-artist")
    await t.mutation(internal.admin.setAccountSuspension, {
      memberId: suspended.memberId,
      suspended: true,
    })
    await expect(
      suspended.client.mutation(api.catalogue.createSong, songInput("Suspendu"))
    ).rejects.toThrow("suspendu")
  })

  it("keeps ownership on every write and upload intent", async () => {
    const t = backend()
    const owner = await artist(t, "catalogue-owner")
    const attacker = await artist(t, "catalogue-attacker")
    const songId = await owner.client.mutation(
      api.catalogue.createSong,
      songInput("Propriété")
    )

    await expect(
      attacker.client.mutation(api.catalogue.publishSong, {
        songId,
        rightsConfirmed: true,
      })
    ).rejects.toThrow("introuvable")
    await expect(
      attacker.client.mutation(api.catalogue.generateArtworkUploadUrl, {
        resource: { kind: "song", id: songId },
      })
    ).rejects.toThrow("introuvable")

    const upload = await owner.client.mutation(
      api.catalogue.generateArtworkUploadUrl,
      { resource: { kind: "song", id: songId } }
    )
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["artwork"], { type: "image/png" }))
    )
    await expect(
      attacker.client.mutation(api.catalogue.saveArtwork, {
        resource: { kind: "song", id: songId },
        intentId: upload.intentId,
        storageId,
      })
    ).rejects.toThrow("introuvable")
    await expect(
      t.run((ctx) => ctx.db.system.get("_storage", storageId))
    ).resolves.not.toBeNull()
  })

  it("preserves submitted section and line ids across lyric edits", async () => {
    const t = backend()
    const { client } = await artist(t, "stable-lyrics")
    const songId = await client.mutation(
      api.catalogue.createSong,
      songInput("Stable")
    )
    const before = await client.query(api.catalogue.getMySong, { songId })
    const section = expectDefined(
      before.sections[0],
      "Expected a lyric section"
    )
    const first = expectDefined(section.lines[0], "Expected a first lyric line")
    const second = expectDefined(
      section.lines[1],
      "Expected a second lyric line"
    )

    await client.mutation(api.catalogue.updateSong, {
      ...songInput("Stable, édité"),
      songId,
      sections: [
        {
          id: section.section._id,
          kind: "verse",
          lines: [
            { id: first._id, text: "Première ligne modifiée" },
            { id: second._id, text: second.text },
            { text: "Nouvelle ligne" },
          ],
        },
      ],
    })
    const after = await client.query(api.catalogue.getMySong, { songId })
    expect(after.sections[0]?.section._id).toBe(section.section._id)
    expect(
      after.sections[0]?.lines
        .slice(0, 2)
        .map((line: Doc<"lyricLines">) => line._id)
    ).toEqual([first._id, second._id])
  })

  it("hides drafts publicly and follows publish/unpublish transitions", async () => {
    const t = backend()
    const { client } = await artist(t, "publish-flow")
    const songId = await client.mutation(
      api.catalogue.createSong,
      songInput("Publication")
    )
    await expect(
      t.query(api.catalogue.getPublishedSong, { songId })
    ).resolves.toBeNull()

    const albumId = await client.mutation(api.catalogue.createAlbum, {
      title: "Album privé",
      credits: [],
    })
    await expect(
      t.query(api.catalogue.getPublishedAlbum, { albumId })
    ).resolves.toBeNull()
    await client.mutation(api.catalogue.publishAlbum, {
      albumId,
      rightsConfirmed: true,
    })
    await expect(
      t.query(api.catalogue.getPublishedAlbum, { albumId })
    ).resolves.toMatchObject({ album: { status: "published" } })
    await client.mutation(api.catalogue.unpublishAlbum, { albumId })
    await expect(
      t.query(api.catalogue.getPublishedAlbum, { albumId })
    ).resolves.toBeNull()
    await client.mutation(api.catalogue.publishSong, {
      songId,
      rightsConfirmed: true,
    })
    await client.mutation(api.catalogue.publishAlbum, {
      albumId,
      rightsConfirmed: true,
    })
    await expect(
      t.query(api.catalogue.getPublishedSong, { songId })
    ).resolves.toMatchObject({ song: { status: "published" } })
    const ownedSong = await client.query(api.catalogue.getMySong, { songId })
    const ownedAlbum = await client.query(api.catalogue.getMyAlbum, { albumId })
    expect(ownedSong.song.rightsConfirmedAt).toEqual(expect.any(Number))
    expect(ownedAlbum.album.rightsConfirmedAt).toEqual(expect.any(Number))
    const member = await client.query(api.members.current, {})
    if (member.state !== "ready") throw new Error("Expected a ready member")
    await t.mutation(internal.admin.setAccountSuspension, {
      memberId: member.member._id,
      suspended: true,
    })
    await expect(
      t.query(api.catalogue.getPublishedSong, { songId })
    ).resolves.toBeNull()
    await expect(
      t.query(api.catalogue.getPublishedAlbum, { albumId })
    ).resolves.toBeNull()
    await t.mutation(internal.admin.setAccountSuspension, {
      memberId: member.member._id,
      suspended: false,
    })
    await client.mutation(api.catalogue.updateSong, {
      ...songInput("Publication modifiée"),
      songId,
    })
    await client.mutation(api.catalogue.updateAlbum, {
      albumId,
      songIds: [],
      title: "Album modifié",
      credits: [],
    })
    const editedSong = await client.query(api.catalogue.getMySong, { songId })
    const editedAlbum = await client.query(api.catalogue.getMyAlbum, {
      albumId,
    })
    expect(editedSong.song).toMatchObject({ status: "draft" })
    expect(editedSong.song.rightsConfirmedAt).toBeUndefined()
    expect(editedAlbum.album).toMatchObject({ status: "draft" })
    expect(editedAlbum.album.rightsConfirmedAt).toBeUndefined()
    await expect(
      t.query(api.catalogue.getPublishedSong, { songId })
    ).resolves.toBeNull()
    await expect(
      t.query(api.catalogue.getPublishedAlbum, { albumId })
    ).resolves.toBeNull()
    await client.mutation(api.catalogue.publishSong, {
      songId,
      rightsConfirmed: true,
    })
    await client.mutation(api.catalogue.unpublishSong, { songId })
    await expect(
      t.query(api.catalogue.getPublishedSong, { songId })
    ).resolves.toBeNull()
  })

  it("validates, attaches and cleans registered artwork uploads", async () => {
    const t = backend()
    const { client, memberId } = await artist(t, "artwork-flow")
    const songId = await client.mutation(
      api.catalogue.createSong,
      songInput("Pochette")
    )
    const upload = await client.mutation(
      api.catalogue.generateArtworkUploadUrl,
      { resource: { kind: "song", id: songId } }
    )
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["artwork"], { type: "image/png" }))
    )
    // convex-test does not persist Blob MIME metadata. Mark this fixture as
    // registered so saveArtwork can exercise the post-validation attach path.
    await t.run((ctx) =>
      ctx.db.patch("catalogueImageUploadIntents", upload.intentId, {
        storageId,
      })
    )
    await client.mutation(api.catalogue.publishSong, {
      songId,
      rightsConfirmed: true,
    })
    await client.mutation(api.catalogue.saveArtwork, {
      resource: { kind: "song", id: songId },
      intentId: upload.intentId,
      storageId,
    })
    const detail = await client.query(api.catalogue.getMySong, { songId })
    expect(detail.song.artworkStorageId).toBe(storageId)
    expect(detail.song.status).toBe("draft")
    expect(detail.song.rightsConfirmedAt).toBeUndefined()

    const invalidIntent = await t.run((ctx) =>
      ctx.db.insert("catalogueImageUploadIntents", {
        ownerMemberId: memberId,
        kind: "song",
        resourceId: songId,
        createdAt: Date.now() - 1,
        expiresAt: Date.now() + 60_000,
      })
    )
    const invalidStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["not an image"], { type: "text/plain" }))
    )
    await expect(
      client.mutation(api.catalogue.registerArtworkUpload, {
        resource: { kind: "song", id: songId },
        intentId: invalidIntent,
        storageId: invalidStorageId,
      })
    ).rejects.toThrow("JPEG")

    const abandonedStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["abandoned"], { type: "image/webp" }))
    )
    const expiredIntent = await t.run((ctx) =>
      ctx.db.insert("catalogueImageUploadIntents", {
        ownerMemberId: memberId,
        kind: "song",
        resourceId: songId,
        storageId: abandonedStorageId,
        createdAt: Date.now() - 120_000,
        expiresAt: Date.now() - 60_000,
      })
    )
    await t.mutation(internal.catalogue.expireArtworkUploadIntent, {
      intentId: expiredIntent,
    })
    await expect(
      t.run((ctx) => ctx.db.system.get("_storage", abandonedStorageId))
    ).resolves.toBeNull()
  })

  it("never deletes artwork claimed through another upload intent", async () => {
    const t = backend()
    const { client, memberId } = await artist(t, "artwork-reservation")
    const songId = await client.mutation(
      api.catalogue.createSong,
      songInput("Pochette partagée")
    )
    const first = await client.mutation(
      api.catalogue.generateArtworkUploadUrl,
      { resource: { kind: "song", id: songId } }
    )
    const second = await client.mutation(
      api.catalogue.generateArtworkUploadUrl,
      { resource: { kind: "song", id: songId } }
    )
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["shared"], { type: "image/png" }))
    )
    await t.run((ctx) =>
      ctx.db.patch("catalogueImageUploadIntents", first.intentId, { storageId })
    )
    await expect(
      client.mutation(api.catalogue.registerArtworkUpload, {
        resource: { kind: "song", id: songId },
        intentId: second.intentId,
        storageId,
      })
    ).rejects.toThrow("réservée")

    await t.run(async (ctx) => {
      await ctx.db.patch("catalogueImageUploadIntents", second.intentId, {
        storageId,
        expiresAt: Date.now() - 1,
      })
      await ctx.db.insert("catalogueImages", {
        ownerMemberId: memberId,
        storageId,
        kind: "song",
        createdAt: Date.now(),
      })
      await ctx.db.patch("songs", songId, { artworkStorageId: storageId })
    })
    await t.mutation(internal.catalogue.expireArtworkUploadIntent, {
      intentId: second.intentId,
    })
    await expect(
      t.run((ctx) => ctx.db.system.get("_storage", storageId))
    ).resolves.not.toBeNull()
  })

  it("sweeps an upload created late in the upload URL lifetime", async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
      const t = backend()
      const { client } = await artist(t, "scheduled-orphan-cleanup")
      const songId = await client.mutation(
        api.catalogue.createSong,
        songInput("Upload orphelin")
      )
      await client.mutation(api.catalogue.generateArtworkUploadUrl, {
        resource: { kind: "song", id: songId },
      })
      vi.advanceTimersByTime(59 * 60 * 1000)
      const storageId = await t.run((ctx) =>
        ctx.storage.store(new Blob(["orphan"], { type: "image/png" }))
      )
      vi.advanceTimersByTime(11 * 60 * 1000)
      await t.mutation(internal.catalogue.sweepUnclaimedStorage, {})
      await expect(
        t.run((ctx) => ctx.db.system.get("_storage", storageId))
      ).resolves.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it("continues storage cleanup across every pagination page", async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
      const t = backend()
      const storageIds = await t.run(async (ctx) => {
        const ids = []
        for (let index = 0; index < 105; index += 1)
          ids.push(await ctx.storage.store(new Blob([`orphan-${index}`])))
        return ids
      })
      vi.advanceTimersByTime(11 * 60 * 1000)
      await t.mutation(internal.catalogue.sweepUnclaimedStorage, {})
      await t.finishAllScheduledFunctions(() => vi.runAllTimers())
      const remaining = await t.run(async (ctx) =>
        Promise.all(storageIds.map((id) => ctx.db.system.get("_storage", id)))
      )
      expect(remaining.every((metadata) => metadata === null)).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it("paginates the complete owned catalogue beyond one hundred items", async () => {
    const t = backend()
    const { client, memberId } = await artist(t, "catalogue-pages")
    await t.run(async (ctx) => {
      for (let index = 0; index < 105; index += 1)
        await ctx.db.insert("songs", {
          ownerMemberId: memberId,
          status: "draft",
          title: `Morceau ${index}`,
          primaryArtist: "Rija",
          guestArtists: [],
          primaryLanguage: "mg",
          writers: [],
          composers: [],
          producers: [],
          listeningLinks: [],
          createdAt: index,
          updatedAt: index,
        })
    })
    const first = await client.query(api.catalogue.listMySongs, {
      paginationOpts: { numItems: 100, cursor: null },
    })
    const second = await client.query(api.catalogue.listMySongs, {
      paginationOpts: { numItems: 100, cursor: first.continueCursor },
    })
    expect(first.page).toHaveLength(100)
    expect(second.page).toHaveLength(5)
    expect(second.isDone).toBe(true)
  })

  it("orders album tracks atomically and enforces a single owned album", async () => {
    const t = backend()
    const firstArtist = await artist(t, "album-owner")
    const secondArtist = await artist(t, "album-outsider")
    const firstSong = await firstArtist.client.mutation(
      api.catalogue.createSong,
      songInput("Premier")
    )
    const secondSong = await firstArtist.client.mutation(
      api.catalogue.createSong,
      songInput("Deuxième")
    )
    const outsiderSong = await secondArtist.client.mutation(
      api.catalogue.createSong,
      songInput("Étranger")
    )
    const albumId = await firstArtist.client.mutation(
      api.catalogue.createAlbum,
      { title: "Album", credits: [] }
    )
    const otherAlbumId = await firstArtist.client.mutation(
      api.catalogue.createAlbum,
      { title: "Autre album", credits: [] }
    )

    await firstArtist.client.mutation(api.catalogue.setAlbumTracks, {
      albumId,
      songIds: [secondSong, firstSong],
    })
    const detail = await firstArtist.client.query(api.catalogue.getMyAlbum, {
      albumId,
    })
    expect(detail.tracks.map(({ song }) => song._id)).toEqual([
      secondSong,
      firstSong,
    ])
    await expect(
      firstArtist.client.mutation(api.catalogue.setAlbumTracks, {
        albumId: otherAlbumId,
        songIds: [firstSong],
      })
    ).rejects.toThrow("qu’à un album")
    await expect(
      firstArtist.client.mutation(api.catalogue.setAlbumTracks, {
        albumId,
        songIds: [outsiderSong],
      })
    ).rejects.toThrow("introuvable")
  })
})
