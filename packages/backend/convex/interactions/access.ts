import type { Id } from "../_generated/dataModel"
import type { QueryCtx, MutationCtx } from "../_generated/server"
import { eligibleMember } from "../discovery/projection"
import { findMemberByIdentity } from "../lib/authz"
import { fail } from "../community/values"

export type SourceId = Id<"songs"> | Id<"communityContributions">

/** Canonical publication and owner checks, independent of projection readiness. */
export async function publicSource(ctx: QueryCtx, id: SourceId) {
  const official = ctx.db.normalizeId("songs", id)
  const row = official
    ? await ctx.db.get("songs", official)
    : await ctx.db.get(
        "communityContributions",
        id as Id<"communityContributions">
      )
  if (!row || row.status !== "published") return null
  const artist = "ownerMemberId" in row
  const owner = artist ? row.ownerMemberId : row.authorMemberId
  if (!(await eligibleMember(ctx, owner, artist ? "artist" : "fan")))
    return null
  return {
    id: String(row._id),
    origin: artist ? ("artist" as const) : ("community" as const),
    title: row.title,
    primaryArtist: row.primaryArtist,
    href: artist ? `/songs/${row._id}` : `/community/${row._id}`,
  }
}
export async function requirePublicSource(ctx: QueryCtx, id: SourceId) {
  const source = await publicSource(ctx, id)
  if (!source) fail("NOT_FOUND", "Public song not found.")
  return source
}
export async function viewer(ctx: QueryCtx) {
  const found = await findMemberByIdentity(ctx)
  if (!found?.member || found.identity.emailVerified !== true) return null
  return (await eligibleMember(ctx, found.member._id)) ? found.member : null
}
export async function changeLikeCount(
  ctx: MutationCtx,
  sourceId: SourceId,
  delta: number
) {
  const row = await ctx.db
    .query("songLikeCounts")
    .withIndex("by_source_id", (q) => q.eq("sourceId", sourceId))
    .unique()
  const count = Math.max(0, (row?.count ?? 0) + delta)
  if (row) await ctx.db.patch("songLikeCounts", row._id, { count })
  else if (count) await ctx.db.insert("songLikeCounts", { sourceId, count })
}
