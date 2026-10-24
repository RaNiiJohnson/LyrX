import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"

import { internal } from "../_generated/api"

// Historical fixture schema: the final application schema must no longer allow
// these fields, but the migration still needs to be tested against old rows.
const legacySchema = defineSchema({
  songs: defineTable({
    title: v.string(),
    primaryLanguage: v.optional(v.string()),
  }),
  albums: defineTable({
    title: v.string(),
    primaryLanguage: v.optional(v.string()),
  }),
  albumTracks: defineTable({
    position: v.number(),
    inheritPrimaryLanguage: v.optional(v.boolean()),
  }),
})
const modules = {
  "../_generated/server.ts": () => import("../_generated/server"),
  "../catalogue/languageMigration.ts": () => import("./languageMigration"),
}

describe("primary language removal", () => {
  it("removes only the legacy song field across bounded pages and is safe to rerun", async () => {
    const t = convexTest(legacySchema, modules)
    await t.run(async (ctx) => {
      for (let n = 0; n < 51; n++)
        await ctx.db.insert("songs", {
          title: `Song ${n}`,
          primaryLanguage: "mg",
        })
    })
    let cursor: string | null = null
    let removed = 0
    let pages = 0
    while (true) {
      const page: {
        removed: number
        processed: number
        isDone: boolean
        continueCursor: string
      } = await t.mutation(
        internal.catalogue.languageMigration.removePrimaryLanguage,
        { table: "songs", cursor }
      )
      expect(page.processed).toBeLessThanOrEqual(25)
      removed += page.removed
      pages++
      if (page.isDone) break
      cursor = page.continueCursor
    }
    expect(pages).toBe(3)
    expect(removed).toBe(51)
    const songs = await t.run((ctx) => ctx.db.query("songs").take(60))
    expect(songs).toHaveLength(51)
    for (const song of songs) {
      expect(song.title).toMatch(/^Song /)
      expect(song).not.toHaveProperty("primaryLanguage")
    }
    const again = await t.mutation(
      internal.catalogue.languageMigration.removePrimaryLanguage,
      { table: "songs", cursor: null }
    )
    expect(again.removed).toBe(0)
  })

  it("removes album language without changing unrelated data", async () => {
    const t = convexTest(legacySchema, modules)
    const id = await t.run((ctx) =>
      ctx.db.insert("albums", { title: "Unchanged", primaryLanguage: "en" })
    )
    const result = await t.mutation(
      internal.catalogue.languageMigration.removePrimaryLanguage,
      { table: "albums", cursor: null }
    )
    expect(result).toMatchObject({ removed: 1, processed: 1, isDone: true })
    expect(await t.run((ctx) => ctx.db.get("albums", id))).toMatchObject({
      title: "Unchanged",
    })
    expect(await t.run((ctx) => ctx.db.get("albums", id))).not.toHaveProperty(
      "primaryLanguage"
    )
  })

  it("removes both true and false inheritance flags, preserving order", async () => {
    const t = convexTest(legacySchema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert("albumTracks", {
        position: 0,
        inheritPrimaryLanguage: true,
      })
      await ctx.db.insert("albumTracks", {
        position: 1,
        inheritPrimaryLanguage: false,
      })
      await ctx.db.insert("albumTracks", { position: 2 })
    })
    const result = await t.mutation(
      internal.catalogue.languageMigration.removePrimaryLanguage,
      { table: "albumTracks", cursor: null }
    )
    expect(result).toMatchObject({ removed: 2, processed: 3, isDone: true })
    const tracks = await t.run((ctx) => ctx.db.query("albumTracks").take(4))
    expect(tracks.map((track) => track.position)).toEqual([0, 1, 2])
    for (const track of tracks)
      expect(track).not.toHaveProperty("inheritPrimaryLanguage")
  })
})
