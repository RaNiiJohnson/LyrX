/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { describe, expect, it, vi } from "vitest"
import aggregateTest from "@convex-dev/aggregate/test"
import rateLimiterTest from "@convex-dev/rate-limiter/test"
import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"

import { api, internal } from "./_generated/api"
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
  for (const name of [
    "catalogueSongs",
    "catalogueSongsByStatus",
    "catalogueAlbums",
    "catalogueAlbumsByStatus",
    "catalogueAlbumTracks",
  ]) {
    aggregateTest.register(t, name)
  }
  rateLimiterTest.register(t)
  return t
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
  lyricsText: "[Couplet 1]\nAndalana voalohany\nAndalana faharoa",
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

  it("deletes an owned song and removes its album association", async () => {
    const t = backend()
    const owner = await artist(t, "delete-song-owner")
    const attacker = await artist(t, "delete-song-attacker")
    const songId = await owner.client.mutation(
      api.catalogue.createSong,
      songInput("À supprimer")
    )
    const albumId = await owner.client.mutation(api.catalogue.createAlbum, {
      title: "Album lié",
      credits: [],
    })
    await owner.client.mutation(api.catalogue.updateAlbum, {
      albumId,
      songIds: [songId],
      title: "Album lié",
      credits: [],
    })
    await t.run(async (ctx) => {
      await ctx.db.patch("songs", songId, { lyricsText: undefined })
      const now = Date.now()
      const sectionId = await ctx.db.insert("songSections", {
        songId,
        kind: "verse",
        position: 0,
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert("lyricLines", {
        songId,
        sectionId,
        text: "Ancienne ligne",
        position: 0,
        createdAt: now,
        updatedAt: now,
      })
    })

    await expect(
      attacker.client.mutation(api.catalogue.deleteSong, { songId })
    ).rejects.toThrow("introuvable")
    await owner.client.mutation(api.catalogue.deleteSong, { songId })

    await expect(
      owner.client.query(api.catalogue.getMySong, { songId })
    ).rejects.toThrow("introuvable")
    await expect(
      t.run((ctx) =>
        ctx.db
          .query("albumTracks")
          .withIndex("by_song_id", (q) => q.eq("songId", songId))
          .unique()
      )
    ).resolves.toBeNull()
    await expect(
      t.run((ctx) =>
        ctx.db
          .query("songSections")
          .withIndex("by_song_id_and_position", (q) => q.eq("songId", songId))
          .take(1)
      )
    ).resolves.toEqual([])
    await expect(
      t.run((ctx) =>
        ctx.db
          .query("lyricLines")
          .withIndex("by_song_id", (q) => q.eq("songId", songId))
          .take(1)
      )
    ).resolves.toEqual([])
    await expect(
      owner.client.query(api.catalogue.getMyAlbum, { albumId })
    ).resolves.toMatchObject({ album: { status: "draft" }, tracks: [] })
  })

  it("preserves the canonical lyric text exactly across create and update", async () => {
    const t = backend()
    const { client } = await artist(t, "stable-lyrics")
    const initialLyrics = "[Couplet 1]\r\nUne ligne\r\n\r\nUne autre\r\n"
    const songId = await client.mutation(api.catalogue.createSong, {
      ...songInput("Stable"),
      lyricsText: initialLyrics,
    })
    const before = await client.query(api.catalogue.getMySong, { songId })
    expect(before.lyricsText).toBe(initialLyrics)

    const editedLyrics = "[Verse]\nPremière ligne\n\n[Chorus]\nRefrain\n"
    await client.mutation(api.catalogue.updateSong, {
      ...songInput("Stable, édité"),
      songId,
      lyricsText: editedLyrics,
    })
    const after = await client.query(api.catalogue.getMySong, { songId })
    expect(after.lyricsText).toBe(editedLyrics)
  })

  it("rejects lyric text beyond the server limit", async () => {
    const t = backend()
    const { client } = await artist(t, "lyrics-limit")

    await expect(
      client.mutation(api.catalogue.createSong, {
        ...songInput("Trop long"),
        lyricsText: "a".repeat(MAX_LYRICS_TEXT_LENGTH + 1),
      })
    ).rejects.toThrow("ne peuvent pas dépasser")
  })

  it("reads legacy lyric rows and backfills them without deleting old data", async () => {
    const t = backend()
    const { client } = await artist(t, "legacy-lyrics")
    const songId = await client.mutation(
      api.catalogue.createSong,
      songInput("Héritage")
    )
    const legacyIds = await t.run(async (ctx) => {
      await ctx.db.patch("songs", songId, { lyricsText: undefined })
      const now = Date.now()
      const sectionId = await ctx.db.insert("songSections", {
        songId,
        kind: "chorus",
        position: 0,
        createdAt: now,
        updatedAt: now,
      })
      const lineId = await ctx.db.insert("lyricLines", {
        songId,
        sectionId,
        text: "Ancien refrain",
        position: 0,
        createdAt: now,
        updatedAt: now,
      })
      return { lineId, sectionId }
    })

    await expect(
      client.query(api.catalogue.getMySong, { songId })
    ).resolves.toMatchObject({ lyricsText: "[Refrain]\nAncien refrain" })

    await expect(
      t.mutation(internal.catalogue.backfillSongLyricsText, {
        cursor: null,
      })
    ).resolves.toEqual({ migrated: 1, scheduledContinuation: false })
    const stored = await t.run((ctx) => ctx.db.get("songs", songId))
    expect(stored?.lyricsText).toBe("[Refrain]\nAncien refrain")
    await expect(
      t.run((ctx) => ctx.db.get("songSections", legacyIds.sectionId))
    ).resolves.not.toBeNull()
    await expect(
      t.run((ctx) => ctx.db.get("lyricLines", legacyIds.lineId))
    ).resolves.not.toBeNull()
  })

  it("continues the lyrics backfill until every legacy song is migrated", async () => {
    const t = backend()
    const { client } = await artist(t, "legacy-lyrics-pages")
    const firstId = await client.mutation(
      api.catalogue.createSong,
      songInput("Premier héritage")
    )
    const secondId = await client.mutation(
      api.catalogue.createSong,
      songInput("Second héritage")
    )
    await t.run(async (ctx) => {
      await ctx.db.patch("songs", firstId, { lyricsText: undefined })
      await ctx.db.patch("songs", secondId, { lyricsText: undefined })
    })

    vi.useFakeTimers()
    try {
      await expect(
        t.mutation(internal.catalogue.backfillSongLyricsText, { cursor: null })
      ).resolves.toEqual({ migrated: 1, scheduledContinuation: true })
      await t.finishAllScheduledFunctions(() => vi.runAllTimers())
    } finally {
      vi.useRealTimers()
    }

    const stored = await t.run(async (ctx) => ({
      first: await ctx.db.get("songs", firstId),
      second: await ctx.db.get("songs", secondId),
    }))
    expect(stored.first?.lyricsText).toBe("")
    expect(stored.second?.lyricsText).toBe("")
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
    await expect(
      client.mutation(api.catalogue.publishAlbum, {
        albumId,
      })
    ).rejects.toThrow("au moins un morceau")
    await client.mutation(api.catalogue.publishSong, {
      songId,
    })
    await client.mutation(api.catalogue.setAlbumTracks, {
      albumId,
      songIds: [songId],
    })
    await client.mutation(api.catalogue.publishAlbum, {
      albumId,
    })
    await expect(
      t.query(api.catalogue.getPublishedAlbum, { albumId })
    ).resolves.toMatchObject({ album: { status: "published" } })
    await client.mutation(api.catalogue.unpublishAlbum, { albumId })
    await expect(
      t.query(api.catalogue.getPublishedAlbum, { albumId })
    ).resolves.toBeNull()
    await client.mutation(api.catalogue.publishAlbum, {
      albumId,
    })
    const publishedSong = await t.query(api.catalogue.getPublishedSong, {
      songId,
    })
    expect(publishedSong).toMatchObject({ song: { status: "published" } })
    expect(publishedSong?.lyricsText).toBe(songInput("Publication").lyricsText)
    expect(publishedSong?.song).not.toHaveProperty("ownerMemberId")
    expect(publishedSong?.song).not.toHaveProperty("rightsConfirmedAt")
    const ownedSong = await client.query(api.catalogue.getMySong, { songId })
    const ownedAlbum = await client.query(api.catalogue.getMyAlbum, { albumId })
    expect(ownedSong.song.rightsConfirmedAt).toBeUndefined()
    expect(ownedAlbum.album.rightsConfirmedAt).toBeUndefined()
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
    vi.useFakeTimers()
    try {
      await t.mutation(internal.catalogueAggregates.backfill, {
        phase: "songs",
        cursor: null,
      })
      await t.finishAllScheduledFunctions(() => vi.runAllTimers())
    } finally {
      vi.useRealTimers()
    }
    const first = await client.query(api.catalogue.listMySongs, {
      paginationOpts: { numItems: 100, cursor: null },
    })
    const second = await client.query(api.catalogue.listMySongs, {
      paginationOpts: { numItems: 100, cursor: first.continueCursor },
    })
    expect(first.page).toHaveLength(100)
    expect(second.page).toHaveLength(5)
    expect(second.isDone).toBe(true)
    expect(first.page[0]).not.toHaveProperty("lyricsText")
    expect(first.page[0]).not.toHaveProperty("ownerMemberId")
  })

  it("keeps aggregate counts and status pagination in sync", async () => {
    const t = backend()
    const { client } = await artist(t, "catalogue-aggregate-counts")
    const draftSongId = await client.mutation(
      api.catalogue.createSong,
      songInput("Brouillon agrégé")
    )
    const publishedSongId = await client.mutation(
      api.catalogue.createSong,
      songInput("Publié agrégé")
    )
    await client.mutation(api.catalogue.publishSong, {
      songId: publishedSongId,
    })
    const albumId = await client.mutation(api.catalogue.createAlbum, {
      title: "Album agrégé",
      credits: [],
    })

    await expect(
      client.query(api.catalogue.getMyCatalogueCounts, {})
    ).resolves.toEqual({
      songs: { all: 2, draft: 1, published: 1 },
      albums: { all: 1, draft: 1, published: 0 },
    })

    const drafts = await client.query(api.catalogue.listMySongs, {
      paginationOpts: { numItems: 10, cursor: null },
      status: "draft",
    })
    const published = await client.query(api.catalogue.listMySongs, {
      paginationOpts: { numItems: 10, cursor: null },
      status: "published",
    })
    expect(drafts.page.map(({ _id }) => _id)).toEqual([draftSongId])
    expect(published.page.map(({ _id }) => _id)).toEqual([publishedSongId])

    await client.mutation(api.catalogue.deleteSong, { songId: draftSongId })
    await client.mutation(api.catalogue.deleteAlbum, { albumId })
    await expect(
      client.query(api.catalogue.getMyCatalogueCounts, {})
    ).resolves.toEqual({
      songs: { all: 1, draft: 0, published: 1 },
      albums: { all: 0, draft: 0, published: 0 },
    })
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
    await firstArtist.client.mutation(api.catalogue.reorderAlbumTracks, {
      albumId,
      songIds: [firstSong, secondSong],
    })
    const reordered = await firstArtist.client.query(api.catalogue.getMyAlbum, {
      albumId,
    })
    expect(reordered.tracks.map(({ song }) => song._id)).toEqual([
      firstSong,
      secondSong,
    ])
    await firstArtist.client.mutation(api.catalogue.detachSongFromAlbum, {
      albumId,
      songId: firstSong,
    })
    await firstArtist.client.mutation(api.catalogue.attachSongToAlbum, {
      albumId,
      songId: firstSong,
      inheritance: {
        inheritArtwork: false,
        inheritPrimaryLanguage: false,
        inheritGenre: false,
        inheritLabel: false,
        inheritCredits: false,
      },
    })
    const reattached = await firstArtist.client.query(
      api.catalogue.getMyAlbum,
      { albumId }
    )
    expect(
      reattached.tracks.map(({ track, song }) => [track.position, song._id])
    ).toEqual([
      [0, secondSong],
      [1, firstSong],
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

  it("inherits album metadata and materializes it before album deletion", async () => {
    const t = backend()
    const owner = await artist(t, "album-inheritance")
    const albumId = await owner.client.mutation(api.catalogue.createAlbum, {
      title: "Héritage",
      primaryLanguage: "mg",
      genre: "rock",
      label: "Label A",
      credits: ["Pochette — Aina"],
    })
    const songId = await owner.client.mutation(api.catalogue.createSong, {
      ...songInput("Piste héritée"),
      primaryLanguage: "fr",
      genre: "pop",
      otherGenre: undefined,
      albumContext: {
        albumId,
        inheritance: {
          inheritArtwork: true,
          inheritPrimaryLanguage: true,
          inheritGenre: true,
          inheritLabel: true,
          inheritCredits: true,
        },
      },
    })

    await expect(
      owner.client.query(api.catalogue.getMySong, { songId })
    ).resolves.toMatchObject({
      song: {
        primaryLanguage: "mg",
        genre: "rock",
        label: "Label A",
        additionalCredits: ["Pochette — Aina"],
      },
      album: { _id: albumId },
      albumTrack: {
        inheritPrimaryLanguage: true,
        inheritGenre: true,
      },
    })

    await owner.client.mutation(api.catalogue.updateAlbum, {
      albumId,
      songIds: [songId],
      title: "Héritage modifié",
      primaryLanguage: "en",
      genre: "jazz",
      label: "Label B",
      credits: ["Mastering — Solo"],
    })
    await expect(
      owner.client.query(api.catalogue.getMySong, { songId })
    ).resolves.toMatchObject({
      song: {
        primaryLanguage: "en",
        genre: "jazz",
        label: "Label B",
        additionalCredits: ["Mastering — Solo"],
      },
    })

    await owner.client.mutation(api.catalogue.deleteAlbum, { albumId })
    await expect(
      owner.client.query(api.catalogue.getMyAlbum, { albumId })
    ).rejects.toThrow("introuvable")
    await expect(
      owner.client.query(api.catalogue.getMySong, { songId })
    ).resolves.toMatchObject({
      song: {
        primaryLanguage: "en",
        genre: "jazz",
        label: "Label B",
        additionalCredits: ["Mastering — Solo"],
      },
      album: null,
      albumTrack: null,
    })
  })
})
