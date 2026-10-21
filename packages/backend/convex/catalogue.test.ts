/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"
import rateLimiterTest from "@convex-dev/rate-limiter/test"

import { api, internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import schema from "./schema"

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
  it("denies anonymous, fan and suspended accounts", async () => {
    const t = backend()
    await expect(t.query(api.catalogue.listMySongs, {})).rejects.toThrow(
      "connexion"
    )
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
      attacker.client.mutation(api.catalogue.publishSong, { songId })
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
    const section = before.sections[0]!
    const first = section.lines[0]!
    const second = section.lines[1]!

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
    await client.mutation(api.catalogue.publishAlbum, { albumId })
    await expect(
      t.query(api.catalogue.getPublishedAlbum, { albumId })
    ).resolves.toMatchObject({ album: { status: "published" } })
    await client.mutation(api.catalogue.unpublishAlbum, { albumId })
    await expect(
      t.query(api.catalogue.getPublishedAlbum, { albumId })
    ).resolves.toBeNull()
    await client.mutation(api.catalogue.publishSong, { songId })
    await expect(
      t.query(api.catalogue.getPublishedSong, { songId })
    ).resolves.toMatchObject({ song: { status: "published" } })
    await client.mutation(api.catalogue.unpublishSong, { songId })
    await expect(
      t.query(api.catalogue.getPublishedSong, { songId })
    ).resolves.toBeNull()
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
