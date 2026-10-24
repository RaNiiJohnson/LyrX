import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalMutation } from "../_generated/server"
import { legacyLyricsText } from "./lyrics"

export const backfillSongLyricsText = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.object({
    migrated: v.number(),
    scheduledContinuation: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("songs").paginate({
      cursor: args.cursor,
      // Legacy lyrics may require up to 4,000 bounded line reads per song.
      // Migrate one song per transaction to stay comfortably inside Convex
      // read limits while the continuation cursor advances the full table.
      numItems: 1,
    })
    let migrated = 0
    for (const song of page.page) {
      if (song.lyricsText === undefined) {
        await ctx.db.patch("songs", song._id, {
          lyricsText: await legacyLyricsText(ctx, song._id),
        })
        migrated += 1
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.catalogue.lyricsMigration.backfillSongLyricsText,
        {
          cursor: page.continueCursor,
        }
      )
    }
    return { migrated, scheduledContinuation: !page.isDone }
  },
})
