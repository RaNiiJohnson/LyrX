import type { WithoutSystemFields } from "convex/server"
import { v } from "convex/values"

import type { Doc } from "../_generated/dataModel"
import { internalMutation } from "../_generated/server"

// These fixed legacy-key deletion patches deliberately survive schema removal.
// Deploy while the old fields are optional, run every page on all three tables,
// verify a second pass removes zero values, and only then tighten the schema.
const songRemoval: Partial<WithoutSystemFields<Doc<"songs">>> & {
  primaryLanguage: undefined
} = { primaryLanguage: undefined }
const albumRemoval: Partial<WithoutSystemFields<Doc<"albums">>> & {
  primaryLanguage: undefined
} = { primaryLanguage: undefined }
const trackRemoval: Partial<WithoutSystemFields<Doc<"albumTracks">>> & {
  inheritPrimaryLanguage: undefined
} = { inheritPrimaryLanguage: undefined }

export const removePrimaryLanguage = internalMutation({
  args: {
    table: v.union(
      v.literal("songs"),
      v.literal("albums"),
      v.literal("albumTracks")
    ),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    removed: v.number(),
    processed: v.number(),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const options = { cursor: args.cursor, numItems: 25 }
    let removed = 0
    if (args.table === "songs") {
      const page = await ctx.db.query("songs").paginate(options)
      for (const song of page.page) {
        if ("primaryLanguage" in song) {
          await ctx.db.patch("songs", song._id, songRemoval)
          removed++
        }
      }
      return {
        removed,
        processed: page.page.length,
        isDone: page.isDone,
        continueCursor: page.continueCursor,
      }
    }
    if (args.table === "albums") {
      const page = await ctx.db.query("albums").paginate(options)
      for (const album of page.page) {
        if ("primaryLanguage" in album) {
          await ctx.db.patch("albums", album._id, albumRemoval)
          removed++
        }
      }
      return {
        removed,
        processed: page.page.length,
        isDone: page.isDone,
        continueCursor: page.continueCursor,
      }
    }
    const page = await ctx.db.query("albumTracks").paginate(options)
    for (const track of page.page) {
      if ("inheritPrimaryLanguage" in track) {
        await ctx.db.patch("albumTracks", track._id, trackRemoval)
        removed++
      }
    }
    return {
      removed,
      processed: page.page.length,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    }
  },
})
