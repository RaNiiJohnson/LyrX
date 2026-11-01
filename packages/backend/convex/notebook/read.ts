import { fingerprint, ownCollection, sourceContent } from "./access"
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server"
import { v } from "convex/values"
import { memberQuery } from "../lib/functions"
import { validatePageSize } from "../community/values"
import { collectionId, MAX_COLLECTIONS, passageCard } from "./model"

// The default collection is represented by null and localized by the client.
// It always exists, including before the member's first write.
export const collections = memberQuery({
  args: {},
  returns: v.array(
    v.object({ id: v.id("notebookCollections"), name: v.string() })
  ),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("notebookCollections")
      .withIndex("by_member_id", (q) => q.eq("memberId", ctx.member._id))
      .take(MAX_COLLECTIONS)
    return rows.map((row) => ({ id: row._id, name: row.name }))
  },
})
export const passages = memberQuery({
  args: {
    collectionId: v.optional(collectionId),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(passageCard),
  handler: async (ctx, args) => {
    validatePageSize(args.paginationOpts)
    if (
      args.collectionId &&
      !(await ctx.db.get("notebookCollections", args.collectionId))
    )
      return { page: [], isDone: true, continueCursor: "" }
    if (args.collectionId !== undefined)
      await ownCollection(ctx, ctx.member._id, args.collectionId)
    const query =
      args.collectionId === undefined
        ? ctx.db
            .query("notebookPassages")
            .withIndex("by_member_id", (q) => q.eq("memberId", ctx.member._id))
        : ctx.db
            .query("notebookPassages")
            .withIndex("by_member_id_and_collection_id", (q) =>
              q
                .eq("memberId", ctx.member._id)
                .eq("collectionId", args.collectionId!)
            )
    const page = await query.order("desc").paginate(args.paginationOpts)
    const cards = await Promise.all(
      page.page.map(async (row) => {
        const source = row.snapshot
          ? await sourceContent(ctx, row.sourceId)
          : null
        const base = {
          id: row._id,
          collectionId: row.collectionId,
          savedAt: row._creationTime,
        }
        if (!source || !row.snapshot)
          return {
            ...base,
            source: null,
            text: null,
            state: "unavailable" as const,
          }
        return {
          ...base,
          source: {
            href: source.href,
            title: row.snapshot.title,
            primaryArtist: row.snapshot.primaryArtist,
            artworkUrl: source.artworkUrl,
            origin: source.origin,
          },
          text: row.snapshot.text,
          state:
            (await fingerprint(source.lyricsText)) === row.snapshot.fingerprint
              ? ("current" as const)
              : ("changed" as const),
        }
      })
    )
    return { ...page, page: cards }
  },
})
