import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server"
import { v } from "convex/values"
import { query } from "../_generated/server"
import { memberQuery } from "../lib/functions"
import { eligibleMember } from "../discovery/projection"
import { validatePageSize } from "../community/values"
import { sourceId, songCard, commentCard } from "./model"
import { publicSource, viewer } from "./access"

export const summary = query({
  args: { sourceId },
  returns: v.union(
    v.null(),
    v.object({ count: v.number(), liked: v.boolean() })
  ),
  handler: async (ctx, args) => {
    if (!(await publicSource(ctx, args.sourceId))) return null
    const member = await viewer(ctx)
    const count = await ctx.db
      .query("songLikeCounts")
      .withIndex("by_source_id", (q) => q.eq("sourceId", args.sourceId))
      .unique()
    const like = member
      ? await ctx.db
          .query("songLikes")
          .withIndex("by_member_id_and_source_id", (q) =>
            q.eq("memberId", member._id).eq("sourceId", args.sourceId)
          )
          .unique()
      : null
    return { count: count?.count ?? 0, liked: Boolean(like) }
  },
})
export const comments = query({
  args: { sourceId, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(commentCard),
  handler: async (ctx, args) => {
    validatePageSize(args.paginationOpts)
    if (!(await publicSource(ctx, args.sourceId)))
      return { page: [], isDone: true, continueCursor: "" }
    const member = await viewer(ctx)
    const page = await ctx.db
      .query("songComments")
      .withIndex("by_source_id", (q) => q.eq("sourceId", args.sourceId))
      .order("asc")
      .paginate(args.paginationOpts)
    const cards = await Promise.all(
      page.page.map(async (row) => {
        if (row.status !== "public" || !row.authorMemberId) return null
        const author = await eligibleMember(ctx, row.authorMemberId)
        if (!author) return null
        const isOwn = row.authorMemberId === member?._id
        return {
          id: row._id,
          body: row.body,
          createdAt: row._creationTime,
          author: {
            handle: author.profile.handle,
            displayName: author.profile.displayName,
            avatarUrl: author.profile.avatarStorageId
              ? await ctx.storage.getUrl(author.profile.avatarStorageId)
              : null,
            role: author.member.role,
          },
          isOwn,
          canReport: Boolean(member) && !isOwn,
        }
      })
    )
    return { ...page, page: cards.filter((x) => x !== null) }
  },
})
export const likedSongs = memberQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(songCard),
  handler: async (ctx, args) => {
    validatePageSize(args.paginationOpts)
    const page = await ctx.db
      .query("songLikes")
      .withIndex("by_member_id", (q) => q.eq("memberId", ctx.member._id))
      .order("desc")
      .paginate(args.paginationOpts)
    const cards = await Promise.all(
      page.page.map((row) => publicSource(ctx, row.sourceId))
    )
    return { ...page, page: cards.filter((x) => x !== null) }
  },
})
