import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server"
import { v } from "convex/values"
import { query } from "../_generated/server"
import { fanQuery } from "../lib/functions"
import schema from "../schema"
import {
  activeContributor,
  fail,
  publicSummary,
  publicMetadata,
  publicValidator,
  summaryValidator,
  validatePageSize,
} from "./values"

export const listPublished = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(summaryValidator),
  handler: async (ctx, args) => {
    validatePageSize(args.paginationOpts)
    const page = await ctx.db
      .query("communityContributions")
      .withIndex("by_status_and_first_published_at", (q) =>
        q.eq("status", "published")
      )
      .order("desc")
      .paginate(args.paginationOpts)
    const summaries = await Promise.all(
      page.page.map((row) => publicSummary(ctx, row))
    )
    return { ...page, page: summaries.filter((row) => row !== null) }
  },
})

export const getPublished = query({
  args: { contributionId: v.id("communityContributions") },
  returns: v.union(v.null(), publicValidator),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("communityContributions", args.contributionId)
    if (!row) return null
    const summary = await publicSummary(ctx, row)
    return summary
      ? {
          ...summary,
          ...publicMetadata(row),
          lyricsText: row.lyricsText,
          ...(row.albumTitle ? { albumTitle: row.albumTitle } : {}),
          revision: row.revision,
        }
      : null
  },
})

export const listMine = fanQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc("communityContributions")),
  handler: (ctx, args) => {
    validatePageSize(args.paginationOpts)
    return ctx.db
      .query("communityContributions")
      .withIndex("by_author_member_id", (q) =>
        q.eq("authorMemberId", ctx.member._id)
      )
      .order("desc")
      .paginate(args.paginationOpts)
  },
})

export const getMine = fanQuery({
  args: { contributionId: v.id("communityContributions") },
  returns: schema.doc("communityContributions").extend({
    artworkUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("communityContributions", args.contributionId)
    if (!row || row.authorMemberId !== ctx.member._id)
      fail("NOT_FOUND", "Contribution not found.")
    return {
      ...row,
      artworkUrl: row.artworkStorageId
        ? await ctx.storage.getUrl(row.artworkStorageId)
        : null,
    }
  },
})

// Bounded, best-effort title/artist warning, not the lot 8 discovery search.
export const findMatches = fanQuery({
  args: { title: v.string(), primaryArtist: v.string() },
  returns: v.array(
    v.object({
      id: v.union(v.id("songs"), v.id("communityContributions")),
      kind: v.union(v.literal("official"), v.literal("community")),
      title: v.string(),
      primaryArtist: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const title = args.title.trim().slice(0, 160)
    const artist = args.primaryArtist.trim().toLocaleLowerCase()
    if (title.length < 2 || !artist) return []
    const [songs, community] = await Promise.all([
      ctx.db
        .query("songs")
        .withSearchIndex("search_title", (q) =>
          q.search("title", title).eq("status", "published")
        )
        .take(10),
      ctx.db
        .query("communityContributions")
        .withSearchIndex("search_title", (q) =>
          q.search("title", title).eq("status", "published")
        )
        .take(10),
    ])
    const matches = []
    for (const row of [
      ...songs.map((song) => ({
        ...song,
        kind: "official" as const,
        author: song.ownerMemberId,
      })),
      ...community.map((item) => ({
        ...item,
        kind: "community" as const,
        author: item.authorMemberId,
      })),
    ]) {
      if (
        row.primaryArtist.trim().toLocaleLowerCase() === artist &&
        (await activeContributor(ctx, row.author))
      )
        matches.push({
          id: row._id,
          kind: row.kind,
          title: row.title,
          primaryArtist: row.primaryArtist,
        })
    }
    return matches
  },
})
