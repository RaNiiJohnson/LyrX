import { fingerprint, ownCollection, ownPassage, sourceContent } from "./access"
import { v } from "convex/values"
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter"
import { components } from "../_generated/api"
import { memberMutation } from "../lib/functions"
import { sourceId } from "../interactions/model"
import { fail } from "../community/values"
import {
  collectionId,
  MAX_COLLECTIONS,
  MAX_EXCERPT,
  MAX_PASSAGES,
} from "./model"

const limiter = new RateLimiter(components.rateLimiter, {
  notebookWrite: {
    kind: "token bucket",
    rate: 120,
    period: HOUR,
    capacity: 30,
  },
})
function name(value: string) {
  const result = value.trim()
  if (!result || result.length > 60)
    fail("NOTEBOOK_NAME", "Collection name must have 1–60 characters.")
  return result
}
export const createCollection = memberMutation({
  args: { name: v.string() },
  returns: v.id("notebookCollections"),
  handler: async (ctx, args) => {
    const value = name(args.name)
    const rows = await ctx.db
      .query("notebookCollections")
      .withIndex("by_member_id", (q) => q.eq("memberId", ctx.member._id))
      .take(MAX_COLLECTIONS)
    const existing = rows.find(
      (row) => row.name.toLocaleLowerCase() === value.toLocaleLowerCase()
    )
    if (existing) return existing._id
    if (rows.length >= MAX_COLLECTIONS)
      fail("NOTEBOOK_LIMIT", "Collection limit reached.")
    await limiter.limit(ctx, "notebookWrite", {
      key: ctx.member._id,
      throws: true,
    })
    return ctx.db.insert("notebookCollections", {
      memberId: ctx.member._id,
      name: value,
    })
  },
})
export const renameCollection = memberMutation({
  args: { collectionId: v.id("notebookCollections"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ownCollection(ctx, ctx.member._id, args.collectionId)
    const value = name(args.name)
    const rows = await ctx.db
      .query("notebookCollections")
      .withIndex("by_member_id", (q) => q.eq("memberId", ctx.member._id))
      .take(MAX_COLLECTIONS)
    if (
      rows.some(
        (row) =>
          row._id !== args.collectionId &&
          row.name.toLocaleLowerCase() === value.toLocaleLowerCase()
      )
    )
      fail("NOTEBOOK_NAME", "Collection name already used.")
    await ctx.db.patch("notebookCollections", args.collectionId, {
      name: value,
    })
    return null
  },
})
export const deleteCollection = memberMutation({
  args: { collectionId: v.id("notebookCollections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(
      "notebookCollections",
      args.collectionId
    )
    if (!collection) return null // Retry after a successful deletion.
    await ownCollection(ctx, ctx.member._id, args.collectionId)
    // Hard per-member cap bounds this atomic move; no intermediate missing collection.
    const rows = await ctx.db
      .query("notebookPassages")
      .withIndex("by_member_id_and_collection_id", (q) =>
        q.eq("memberId", ctx.member._id).eq("collectionId", args.collectionId)
      )
      .take(MAX_PASSAGES)
    for (const row of rows)
      await ctx.db.patch("notebookPassages", row._id, { collectionId: null })
    await ctx.db.delete("notebookCollections", args.collectionId)
    return null
  },
})
export const save = memberMutation({
  args: {
    sourceId,
    collectionId,
    sourceText: v.string(),
    start: v.number(),
    end: v.number(),
  },
  returns: v.id("notebookPassages"),
  handler: async (ctx, args) => {
    await ownCollection(ctx, ctx.member._id, args.collectionId)
    const source = await sourceContent(ctx, args.sourceId)
    if (!source) fail("NOT_FOUND", "Public source not found.")
    if (source.lyricsText !== args.sourceText)
      fail(
        "NOTEBOOK_SOURCE_CHANGED",
        "Source changed; select the passage again."
      )
    if (
      !Number.isSafeInteger(args.start) ||
      !Number.isSafeInteger(args.end) ||
      args.start < 0 ||
      args.end > source.lyricsText.length ||
      args.start >= args.end ||
      args.end - args.start > MAX_EXCERPT
    )
      fail("NOTEBOOK_RANGE", "Invalid selected range.")
    const text = source.lyricsText.slice(args.start, args.end)
    if (!text.trim()) fail("NOTEBOOK_RANGE", "Select nonempty text.")
    // Never split a Unicode surrogate pair at either boundary.
    for (const offset of [args.start, args.end]) {
      const code = source.lyricsText.charCodeAt(offset)
      if (code >= 0xdc00 && code <= 0xdfff)
        fail("NOTEBOOK_RANGE", "Invalid Unicode boundary.")
    }
    const hash = await fingerprint(source.lyricsText)
    const existing = await ctx.db
      .query("notebookPassages")
      .withIndex("by_member_id_and_source_id", (q) =>
        q.eq("memberId", ctx.member._id).eq("sourceId", args.sourceId)
      )
      .take(MAX_PASSAGES)
    const duplicate = existing.find(
      (row) =>
        row.collectionId === args.collectionId &&
        row.snapshot?.fingerprint === hash &&
        row.snapshot.start === args.start &&
        row.snapshot.end === args.end
    )
    if (duplicate) return duplicate._id
    const quota = await ctx.db
      .query("notebookPassages")
      .withIndex("by_member_id", (q) => q.eq("memberId", ctx.member._id))
      .take(MAX_PASSAGES)
    if (quota.length >= MAX_PASSAGES)
      fail("NOTEBOOK_LIMIT", "Passage limit reached.")
    await limiter.limit(ctx, "notebookWrite", {
      key: ctx.member._id,
      throws: true,
    })
    return ctx.db.insert("notebookPassages", {
      memberId: ctx.member._id,
      collectionId: args.collectionId,
      sourceId: args.sourceId,
      sourceOwnerId: source.ownerId,
      snapshot: {
        text,
        fingerprint: hash,
        start: args.start,
        end: args.end,
        title: source.title,
        primaryArtist: source.primaryArtist,
      },
    })
  },
})
export const move = memberMutation({
  args: { passageId: v.id("notebookPassages"), collectionId },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ownPassage(ctx, ctx.member._id, args.passageId)
    await ownCollection(ctx, ctx.member._id, args.collectionId)
    await ctx.db.patch("notebookPassages", args.passageId, {
      collectionId: args.collectionId,
    })
    return null
  },
})
export const remove = memberMutation({
  args: { passageId: v.id("notebookPassages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await ctx.db.get("notebookPassages", args.passageId))) return null
    await ownPassage(ctx, ctx.member._id, args.passageId)
    await ctx.db.delete("notebookPassages", args.passageId)
    return null
  },
})
