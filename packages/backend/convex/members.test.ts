/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"
import rateLimiterTest from "@convex-dev/rate-limiter/test"

import { api, internal } from "./_generated/api"
import schema from "./schema"
import { deleteOwnedProfileImageIfUnreferenced } from "./lib/profileImages"

const modules = import.meta.glob("./**/*.ts")

function createTestBackend() {
  const t = convexTest(schema, modules)
  rateLimiterTest.register(t)
  return t
}

const verifiedFan = {
  tokenIdentifier: "https://issuer.example|fan-1",
  subject: "fan-1",
  issuer: "https://issuer.example",
  email: "Fan@Example.com",
  emailVerified: true,
  name: "Fan Test",
}

describe("member onboarding and authorization", () => {
  it("reports anonymous and unverified session states", async () => {
    const t = createTestBackend()

    await expect(t.query(api.members.current, {})).resolves.toEqual({
      state: "anonymous",
    })

    const unverified = t.withIdentity({
      ...verifiedFan,
      emailVerified: false,
    })
    await expect(unverified.query(api.members.current, {})).resolves.toEqual({
      state: "email-unverified",
      email: "Fan@Example.com",
    })
    await expect(
      unverified.mutation(api.members.completeOnboarding, {
        role: "fan",
        handle: "fan.test",
        displayName: "Fan Test",
      })
    ).rejects.toThrow("L’adresse email doit être vérifiée")
  })

  it("creates an artist identity atomically and exposes only its public profile", async () => {
    const t = createTestBackend()
    const artist = t.withIdentity({
      ...verifiedFan,
      tokenIdentifier: "https://issuer.example|artist-1",
      subject: "artist-1",
      email: "artist@example.com",
    })

    await artist.mutation(api.members.completeOnboarding, {
      role: "artist",
      handle: "Rija.Music",
      displayName: "Rija Music",
      bio: "Artiste malgache",
      artist: {
        presentation: "Des chansons qui racontent Madagascar.",
        instagramUrl: "https://instagram.com/rijamusic",
        customLinks: [{ label: "Site", url: "https://rija.example" }],
      },
    })

    const current = await artist.query(api.members.current, {})
    expect(current.state).toBe("ready")
    if (current.state !== "ready") throw new Error("Expected ready member")
    expect(current.member.role).toBe("artist")
    expect(current.member.isAdmin).toBe(false)
    expect(current.profile.handle).toBe("rija.music")
    expect(current.artistProfile?.presentation).toContain("Madagascar")

    await expect(
      t.query(api.members.publicByHandle, { handle: "RIJA.MUSIC" })
    ).resolves.toMatchObject({
      handle: "rija.music",
      role: "artist",
      artist: {
        customLinks: [{ label: "Site", url: "https://rija.example/" }],
      },
    })
  })

  it("keeps handles unique and onboarding single-use", async () => {
    const t = createTestBackend()
    const first = t.withIdentity(verifiedFan)
    await first.mutation(api.members.completeOnboarding, {
      role: "fan",
      handle: "unique-fan",
      displayName: "Premier Fan",
    })

    await expect(
      first.mutation(api.members.completeOnboarding, {
        role: "artist",
        handle: "another-handle",
        displayName: "Premier Fan",
      })
    ).rejects.toThrow("déjà terminé")

    const second = t.withIdentity({
      ...verifiedFan,
      tokenIdentifier: "https://issuer.example|fan-2",
      subject: "fan-2",
      email: "fan2@example.com",
    })
    await expect(
      second.mutation(api.members.completeOnboarding, {
        role: "fan",
        handle: "UNIQUE-FAN",
        displayName: "Deuxième Fan",
      })
    ).rejects.toThrow("déjà utilisé")
  })

  it("blocks suspended accounts at the function layer and hides their profile", async () => {
    const t = createTestBackend()
    const fan = t.withIdentity(verifiedFan)
    const created = await fan.mutation(api.members.completeOnboarding, {
      role: "fan",
      handle: "suspended-fan",
      displayName: "Fan Suspendu",
    })

    await t.mutation(internal.admin.setAccountSuspension, {
      memberId: created.memberId,
      suspended: true,
    })

    await expect(
      fan.mutation(api.members.updateMyProfile, {
        handle: "suspended-fan",
        displayName: "Nouveau nom",
      })
    ).rejects.toThrow("suspendu")
    await expect(
      t.query(api.members.publicByHandle, { handle: "suspended-fan" })
    ).resolves.toBeNull()
    await expect(fan.query(api.members.current, {})).resolves.toEqual({
      state: "suspended",
    })
  })

  it("preserves unowned invalid uploads and limits banner intents to artists", async () => {
    const t = createTestBackend()
    const fan = t.withIdentity(verifiedFan)
    await fan.mutation(api.members.completeOnboarding, {
      role: "fan",
      handle: "image-fan",
      displayName: "Image Fan",
    })

    const avatarUpload = await fan.mutation(
      api.members.generateProfileImageUploadUrl,
      { kind: "avatar" }
    )
    const avatarStorageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["avatar"], { type: "image/png" }))
    )
    await expect(
      fan.mutation(api.members.saveProfileImage, {
        kind: "avatar",
        storageId: avatarStorageId,
        uploadIntentId: avatarUpload.uploadIntentId,
      })
    ).resolves.toMatchObject({ ok: false })
    await expect(
      t.run((ctx) => ctx.db.system.get("_storage", avatarStorageId))
    ).resolves.not.toBeNull()

    await expect(
      fan.mutation(api.members.generateProfileImageUploadUrl, {
        kind: "banner",
      })
    ).rejects.toThrow("Seul un compte artiste")
  })

  it("never attaches or deletes another member's public profile image", async () => {
    const t = createTestBackend()
    const owner = t.withIdentity({
      ...verifiedFan,
      tokenIdentifier: "https://issuer.example|image-owner",
      subject: "image-owner",
      email: "owner@example.com",
    })
    const attacker = t.withIdentity({
      ...verifiedFan,
      tokenIdentifier: "https://issuer.example|image-attacker",
      subject: "image-attacker",
      email: "attacker@example.com",
    })

    await owner.mutation(api.members.completeOnboarding, {
      role: "fan",
      handle: "image-owner",
      displayName: "Image Owner",
    })
    await attacker.mutation(api.members.completeOnboarding, {
      role: "fan",
      handle: "image-attacker",
      displayName: "Image Attacker",
    })

    const victimStorageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["valid avatar"], { type: "image/png" }))
    )
    await t.run(async (ctx) => {
      const ownerMember = await ctx.db
        .query("members")
        .withIndex("by_auth_user_id", (q) =>
          q.eq("authUserId", "https://issuer.example|image-owner")
        )
        .unique()
      if (!ownerMember) throw new Error("Expected image owner")
      const ownerProfile = await ctx.db
        .query("profiles")
        .withIndex("by_member_id", (q) => q.eq("memberId", ownerMember._id))
        .unique()
      if (!ownerProfile) throw new Error("Expected owner profile")
      await ctx.db.patch("profiles", ownerProfile._id, {
        avatarStorageId: victimStorageId,
      })
      await ctx.db.insert("profileImages", {
        memberId: ownerMember._id,
        storageId: victimStorageId,
        kind: "avatar",
        createdAt: Date.now(),
      })
    })

    const publicProfile = await t.query(api.members.publicByHandle, {
      handle: "image-owner",
    })
    expect(publicProfile?.avatarUrl).toMatch(/^https:\/\//)

    const attackerUpload = await attacker.mutation(
      api.members.generateProfileImageUploadUrl,
      { kind: "avatar" }
    )
    await expect(
      attacker.mutation(api.members.saveProfileImage, {
        kind: "avatar",
        storageId: victimStorageId,
        uploadIntentId: attackerUpload.uploadIntentId,
      })
    ).rejects.toThrow("appartient à un autre compte")
    await expect(
      t.run((ctx) => ctx.db.system.get("_storage", victimStorageId))
    ).resolves.not.toBeNull()
    await expect(
      t.query(api.members.publicByHandle, { handle: "image-owner" })
    ).resolves.toMatchObject({ avatarUrl: publicProfile?.avatarUrl })

    const poisonedStorageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["poisoned legacy image"]))
    )
    await t.run(async (ctx) => {
      const ownerMember = await ctx.db
        .query("members")
        .withIndex("by_auth_user_id", (q) =>
          q.eq("authUserId", "https://issuer.example|image-owner")
        )
        .unique()
      const attackerMember = await ctx.db
        .query("members")
        .withIndex("by_auth_user_id", (q) =>
          q.eq("authUserId", "https://issuer.example|image-attacker")
        )
        .unique()
      if (!ownerMember || !attackerMember) {
        throw new Error("Expected both image-test members")
      }
      await ctx.db.insert("profileImages", {
        memberId: attackerMember._id,
        storageId: poisonedStorageId,
        kind: "avatar",
        createdAt: Date.now(),
      })
      await expect(
        deleteOwnedProfileImageIfUnreferenced(ctx, {
          memberId: ownerMember._id,
          storageId: poisonedStorageId,
          kind: "avatar",
        })
      ).resolves.toBe(false)
    })
    await expect(
      t.run((ctx) => ctx.db.system.get("_storage", poisonedStorageId))
    ).resolves.not.toBeNull()
  })

  it("rate-limits profile image upload intents per member", async () => {
    const t = createTestBackend()
    const fan = t.withIdentity(verifiedFan)
    await fan.mutation(api.members.completeOnboarding, {
      role: "fan",
      handle: "rate-limited-image-fan",
      displayName: "Rate Limited Fan",
    })

    for (let index = 0; index < 5; index += 1) {
      await expect(
        fan.mutation(api.members.generateProfileImageUploadUrl, {
          kind: "avatar",
        })
      ).resolves.toMatchObject({ uploadUrl: expect.any(String) })
    }
    await expect(
      fan.mutation(api.members.generateProfileImageUploadUrl, {
        kind: "avatar",
      })
    ).rejects.toThrow()
  })

  it("bootstraps exactly one verified admin through an internal function", async () => {
    const t = createTestBackend()
    const fan = t.withIdentity(verifiedFan)
    const created = await fan.mutation(api.members.completeOnboarding, {
      role: "fan",
      handle: "future-admin",
      displayName: "Future Admin",
    })

    await expect(
      t.mutation(internal.admin.bootstrapFirstAdmin, {
        email: "fan@example.com",
      })
    ).resolves.toBe(created.memberId)

    await expect(
      t.mutation(internal.admin.bootstrapFirstAdmin, {
        email: "fan@example.com",
      })
    ).rejects.toThrow("existe déjà")

    const current = await fan.query(api.members.current, {})
    expect(current.state).toBe("ready")
    if (current.state !== "ready") throw new Error("Expected ready member")
    expect(current.member.isAdmin).toBe(true)
  })
})
