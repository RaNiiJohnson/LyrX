/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"
import aggregateTest from "@convex-dev/aggregate/test"
import rateLimiterTest from "@convex-dev/rate-limiter/test"
import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"
import { api } from "./_generated/api"
import schema from "./schema"

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
async function member(
  t: ReturnType<typeof backend>,
  name: string,
  role: "fan" | "artist" = "fan",
  isAdmin = false
) {
  const client = t.withIdentity({
    tokenIdentifier: `https://issuer.example|${name}`,
    subject: name,
    issuer: "https://issuer.example",
    email: `${name}@example.com`,
    emailVerified: true,
  })
  const { memberId } = await client.mutation(api.members.completeOnboarding, {
    role,
    handle: name,
    displayName: name,
  })
  if (isAdmin)
    await t.run((ctx) => ctx.db.patch("members", memberId, { isAdmin: true }))
  return { client, memberId }
}
const input = (requestId = "one") => ({
  title: "Hira iray",
  primaryArtist: "Rija",
  lyricsText: "[Couplet]\r\nAndalana 1\r\n\r\nAndalana 2  ",
  albumTitle: "Rakikira",
  requestId,
})
const page = { numItems: 2, cursor: null }

describe("community fan lyrics", () => {
  it("publishes immediately with immutable session attribution, preserving raw text and excluding private fields", async () => {
    const t = backend(),
      fan = await member(t, "fan-one")
    const id = await fan.client.mutation(api.community.write.publish, input())
    const stored = await t.run((ctx) =>
      ctx.db.get("communityContributions", id)
    )
    expect(stored).toMatchObject({
      status: "published",
      authorMemberId: fan.memberId,
      lyricsText: input().lyricsText,
    })
    const publicRow = await t.query(api.community.read.getPublished, {
      contributionId: id,
    })
    expect(publicRow).toMatchObject({
      title: "Hira iray",
      contributor: { handle: "fan-one", displayName: "fan-one" },
      lyricsText: input().lyricsText,
    })
    expect(publicRow).not.toHaveProperty("authorMemberId")
    expect(publicRow).not.toHaveProperty("requestId")
    expect(
      (
        await t.query(api.community.read.listPublished, {
          paginationOpts: page,
        })
      ).page
    ).toHaveLength(1)
    const forged = { ...input("forged"), authorMemberId: fan.memberId }
    await expect(
      fan.client.mutation(api.community.write.publish, forged)
    ).rejects.toThrow("authorMemberId")
  })

  it("rejects anonymous, artist, unverified and suspended publication", async () => {
    const t = backend(),
      artist = await member(t, "artist-one"),
      fan = await member(t, "fan-two")
    await t.run((ctx) =>
      ctx.db.patch("members", artist.memberId, { role: "artist" })
    )
    await expect(
      t.mutation(api.community.write.publish, input())
    ).rejects.toThrow("UNAUTHENTICATED")
    await expect(
      artist.client.mutation(api.community.write.publish, input())
    ).rejects.toThrow("FAN_REQUIRED")
    await expect(
      t
        .withIdentity({
          tokenIdentifier: "https://issuer.example|fan-two",
          email: "fan-two@example.com",
          emailVerified: false,
        })
        .mutation(api.community.write.publish, input())
    ).rejects.toThrow("EMAIL_NOT_VERIFIED")
    await t.run((ctx) =>
      ctx.db.patch("members", fan.memberId, { status: "suspended" })
    )
    await expect(
      fan.client.mutation(api.community.write.publish, input())
    ).rejects.toThrow("ACCOUNT_SUSPENDED")
  })

  it("keeps artist ownership and the official catalogue isolated", async () => {
    const t = backend(),
      fan = await member(t, "fan-three"),
      artist = await member(t, "artist-two", "artist")
    const official = await artist.client.mutation(
      api.catalogue.songs.createSong,
      {
        title: "Hira iray",
        primaryArtist: "Rija",
        lyricsText: "Official source",
        guestArtists: [],
        writers: [],
        composers: [],
        producers: [],
        listeningLinks: [],
      }
    )
    await artist.client.mutation(api.catalogue.songs.publishSong, {
      songId: official,
    })
    const snapshot = await t.run((ctx) => ctx.db.get("songs", official))
    const id = await fan.client.mutation(api.community.write.publish, input())
    const { requestId: _requestId, ...communityValue } = input()
    await expect(
      fan.client.mutation(api.catalogue.songs.updateSong, {
        songId: official,
        title: "Changed",
        primaryArtist: "Rija",
        lyricsText: "Changed",
        guestArtists: [],
        writers: [],
        composers: [],
        producers: [],
        listeningLinks: [],
      })
    ).rejects.toThrow("ARTIST_REQUIRED")
    await expect(
      artist.client.mutation(api.community.write.update, {
        ...communityValue,
        contributionId: id,
        expectedRevision: 1,
      })
    ).rejects.toThrow("FAN_REQUIRED")
    expect(await t.run((ctx) => ctx.db.get("songs", official))).toEqual(
      snapshot
    )
    const matches = await fan.client.query(api.community.read.findMatches, {
      title: "Hira iray",
      primaryArtist: "Rija",
    })
    expect(matches.map((m) => m.kind).sort()).toEqual(["community", "official"])
  })

  it("rejects empty/oversized lyrics and invalid metadata without storing a row", async () => {
    const t = backend(),
      fan = await member(t, "fan-four")
    for (const lyricsText of [
      " \r\n\t",
      "x".repeat(MAX_LYRICS_TEXT_LENGTH + 1),
    ])
      await expect(
        fan.client.mutation(api.community.write.publish, {
          ...input(),
          lyricsText,
        })
      ).rejects.toThrow("INVALID_LYRICS")
    await expect(
      fan.client.mutation(api.community.write.publish, {
        ...input(),
        title: " ",
      })
    ).rejects.toThrow("INVALID_INPUT")
    expect(
      (
        await t.query(api.community.read.listPublished, {
          paginationOpts: page,
        })
      ).page
    ).toEqual([])
  })

  it("makes concurrent publication retries idempotent and rate-limits distinct writes", async () => {
    const t = backend(),
      fan = await member(t, "fan-five")
    const ids = await Promise.all([
      fan.client.mutation(api.community.write.publish, input()),
      fan.client.mutation(api.community.write.publish, input()),
    ])
    expect(ids[0]).toBe(ids[1])
    await fan.client.mutation(api.community.write.publish, input("two"))
    await fan.client.mutation(api.community.write.publish, input("three"))
    await expect(
      fan.client.mutation(api.community.write.publish, input("four"))
    ).rejects.toThrow()
    expect(
      (
        await fan.client.query(api.community.read.listMine, {
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page
    ).toHaveLength(3)
  })

  it("protects cross-account reads and edits and preserves first publication time", async () => {
    const t = backend(),
      owner = await member(t, "fan-six"),
      other = await member(t, "fan-seven")
    const id = await owner.client.mutation(api.community.write.publish, input())
    const before = await owner.client.query(api.community.read.getMine, {
      contributionId: id,
    })
    await expect(
      other.client.query(api.community.read.getMine, { contributionId: id })
    ).rejects.toThrow("NOT_FOUND")
    const { requestId: _requestId, ...value } = input()
    const forgedUpdate = {
      ...value,
      contributionId: id,
      expectedRevision: 1,
      authorMemberId: other.memberId,
    }
    await expect(
      owner.client.mutation(api.community.write.update, forgedUpdate)
    ).rejects.toThrow("authorMemberId")
    await expect(
      other.client.mutation(api.community.write.update, {
        ...value,
        contributionId: id,
        expectedRevision: 1,
      })
    ).rejects.toThrow("NOT_FOUND")
    await owner.client.mutation(api.community.write.update, {
      ...value,
      albumTitle: undefined,
      lyricsText: "Edited\n\nexact",
      contributionId: id,
      expectedRevision: 1,
    })
    const after = await owner.client.query(api.community.read.getMine, {
      contributionId: id,
    })
    expect(after).toMatchObject({
      revision: 2,
      firstPublishedAt: before.firstPublishedAt,
      authorMemberId: before.authorMemberId,
      lyricsText: "Edited\n\nexact",
    })
    expect(after).not.toHaveProperty("albumTitle")
    await expect(
      owner.client.mutation(api.community.write.update, {
        ...value,
        contributionId: id,
        expectedRevision: 1,
      })
    ).rejects.toThrow("REVISION_CONFLICT")
  })

  it("keeps reports private and reported lyrics public until a moderator acts", async () => {
    const t = backend(),
      owner = await member(t, "fan-eight"),
      reporter = await member(t, "reporter-one"),
      admin = await member(t, "admin-one", "artist", true)
    const id = await owner.client.mutation(api.community.write.publish, input())
    const reports = await Promise.all([
      reporter.client.mutation(api.community.moderation.report, {
        contributionId: id,
        reason: "Wrong transcription",
      }),
      reporter.client.mutation(api.community.moderation.report, {
        contributionId: id,
        reason: "Wrong transcription",
      }),
    ])
    expect(reports[0]).toBe(reports[1])
    expect(
      await t.query(api.community.read.getPublished, { contributionId: id })
    ).not.toBeNull()
    await expect(
      reporter.client.query(api.community.moderation.listReports, {
        status: "open",
        paginationOpts: page,
      })
    ).rejects.toThrow("FORBIDDEN")
    await expect(
      t.query(api.community.moderation.getReport, { reportId: reports[0] })
    ).rejects.toThrow("UNAUTHENTICATED")
    expect(
      (
        await admin.client.query(api.community.moderation.listReports, {
          status: "open",
          paginationOpts: page,
        })
      ).page
    ).toHaveLength(1)
    await expect(
      owner.client.mutation(api.community.moderation.resolve, {
        reportId: reports[0],
        action: "hide",
        reason: "Not allowed",
        expectedRevision: 1,
      })
    ).rejects.toThrow("FORBIDDEN")
  })

  it.each(["hide", "remove"] as const)(
    "%s requires a report and reason, is audited once and blocks republishing",
    async (action) => {
      const t = backend(),
        owner = await member(t, "fan-nine"),
        admin = await member(t, "admin-two", "artist", true)
      const id = await owner.client.mutation(
        api.community.write.publish,
        input()
      )
      const reportId = await admin.client.mutation(
        api.community.moderation.report,
        { contributionId: id, reason: "Content issue" }
      )
      const decision = {
        reportId,
        action,
        reason: "Reviewed after report",
        expectedRevision: 1,
      }
      await expect(
        admin.client.mutation(api.community.moderation.resolve, {
          ...decision,
          reason: " ",
        })
      ).rejects.toThrow("INVALID_INPUT")
      await Promise.all([
        admin.client.mutation(api.community.moderation.resolve, decision),
        admin.client.mutation(api.community.moderation.resolve, decision),
      ])
      expect(
        await t.query(api.community.read.getPublished, { contributionId: id })
      ).toBeNull()
      expect(
        (
          await t.query(api.community.read.listPublished, {
            paginationOpts: page,
          })
        ).page
      ).toEqual([])
      expect(
        await owner.client.query(api.community.read.findMatches, {
          title: "Hira iray",
          primaryArtist: "Rija",
        })
      ).toEqual([])
      const {
        report,
        contribution,
        decision: audit,
      } = await admin.client.query(api.community.moderation.getReport, {
        reportId,
      })
      expect(report.status).toBe("resolved")
      expect(contribution.status).toBe(action === "hide" ? "hidden" : "removed")
      expect(audit).toMatchObject({
        moderatorMemberId: admin.memberId,
        action,
        reason: decision.reason,
      })
      expect(
        await t.run((ctx) => ctx.db.query("communityModeration").take(3))
      ).toHaveLength(1)
      const { requestId: _requestId, ...value } = input()
      await expect(
        owner.client.mutation(api.community.write.update, {
          ...value,
          contributionId: id,
          expectedRevision: 1,
        })
      ).rejects.toThrow("CONTRIBUTION_MODERATED")
      expect(
        await owner.client.mutation(api.community.write.publish, input())
      ).toBe(id)
      expect(
        await t.query(api.community.read.getPublished, { contributionId: id })
      ).toBeNull()
      await expect(
        admin.client.mutation(api.community.moderation.resolve, {
          ...decision,
          action: "dismiss",
        })
      ).rejects.toThrow("REPORT_RESOLVED")
    }
  )

  it("cannot moderate without an existing report or accept a client-selected contribution", async () => {
    const t = backend(),
      owner = await member(t, "unreported-author"),
      admin = await member(t, "unreported-admin", "artist", true)
    const contributionId = await owner.client.mutation(
      api.community.write.publish,
      input()
    )
    const reportId = await admin.client.mutation(
      api.community.moderation.report,
      { contributionId, reason: "Temporary report fixture" }
    )
    await t.run((ctx) => ctx.db.delete("communityReports", reportId))
    const decision = {
      reportId,
      action: "hide" as const,
      reason: "Review requires a report",
      expectedRevision: 1,
    }
    await expect(
      admin.client.mutation(api.community.moderation.resolve, decision)
    ).rejects.toThrow("NOT_FOUND")
    const forgedDecision = { ...decision, contributionId }
    await expect(
      admin.client.mutation(api.community.moderation.resolve, forgedDecision)
    ).rejects.toThrow("contributionId")
    expect(
      await t.query(api.community.read.getPublished, { contributionId })
    ).not.toBeNull()
    expect(
      await t.run((ctx) => ctx.db.query("communityModeration").take(1))
    ).toEqual([])
  })

  it("dismisses reports without changing public content and detects stale moderation", async () => {
    const t = backend(),
      owner = await member(t, "fan-ten"),
      admin = await member(t, "admin-three", "fan", true)
    const id = await owner.client.mutation(api.community.write.publish, input())
    const reportId = await admin.client.mutation(
      api.community.moderation.report,
      { contributionId: id, reason: "Please review" }
    )
    const { requestId: _requestId, ...value } = input()
    await owner.client.mutation(api.community.write.update, {
      ...value,
      contributionId: id,
      expectedRevision: 1,
    })
    await expect(
      admin.client.mutation(api.community.moderation.resolve, {
        reportId,
        action: "hide",
        reason: "Stale decision",
        expectedRevision: 1,
      })
    ).rejects.toThrow("REVISION_CONFLICT")
    await admin.client.mutation(api.community.moderation.resolve, {
      reportId,
      action: "dismiss",
      reason: "No violation",
      expectedRevision: 2,
    })
    expect(
      await t.query(api.community.read.getPublished, { contributionId: id })
    ).not.toBeNull()
  })

  it("hides suspended authors from every public projection and rejects their edits/reports", async () => {
    const t = backend(),
      owner = await member(t, "fan-eleven"),
      other = await member(t, "fan-twelve")
    const id = await owner.client.mutation(api.community.write.publish, input())
    await t.run((ctx) =>
      ctx.db.patch("members", owner.memberId, { status: "suspended" })
    )
    expect(
      await t.query(api.community.read.getPublished, { contributionId: id })
    ).toBeNull()
    expect(
      (
        await t.query(api.community.read.listPublished, {
          paginationOpts: page,
        })
      ).page
    ).toEqual([])
    expect(
      await other.client.query(api.community.read.findMatches, {
        title: "Hira iray",
        primaryArtist: "Rija",
      })
    ).toEqual([])
    await expect(
      owner.client.mutation(api.community.moderation.report, {
        contributionId: id,
        reason: "Report",
      })
    ).rejects.toThrow("ACCOUNT_SUSPENDED")
  })

  it("paginates published contributions without leaking hidden rows", async () => {
    const t = backend(),
      owner = await member(t, "fan-thirteen")
    await t.run(async (ctx) => {
      for (let n = 0; n < 7; n++)
        await ctx.db.insert("communityContributions", {
          ...input(String(n)),
          authorMemberId: owner.memberId,
          status: n % 2 ? "hidden" : "published",
          revision: 1,
          firstPublishedAt: n,
          updatedAt: n,
        })
    })
    const first = await t.query(api.community.read.listPublished, {
      paginationOpts: page,
    })
    const second = await t.query(api.community.read.listPublished, {
      paginationOpts: { ...page, cursor: first.continueCursor },
    })
    expect(first.isDone).toBe(false)
    expect(second.isDone).toBe(true)
    expect(
      [...first.page, ...second.page].map((row) => row.firstPublishedAt)
    ).toEqual([6, 4, 2, 0])
  })
})
