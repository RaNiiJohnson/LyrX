import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter"
import { v } from "convex/values"
import { components, internal } from "../_generated/api"
import { memberMutation } from "../lib/functions"
import { changeViews, eligibleMember } from "./projection"
import { origin } from "./model"

const DAY = 86_400_000
const limiter = new RateLimiter(components.rateLimiter, {
  discoveryView: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 10,
  },
})

/** Signed-in, non-self, per-member/source/UTC-day views; never a playback count. */
export const recordView = memberMutation({
  args: {
    sourceId: v.union(v.id("songs"), v.id("communityContributions")),
    origin,
  },
  returns: v.object({ counted: v.boolean() }),
  handler: async (ctx, args) => {
    const source =
      args.origin === "artist"
        ? ctx.db.normalizeId("songs", args.sourceId)
        : ctx.db.normalizeId("communityContributions", args.sourceId)
    if (!source) return { counted: false }
    const row =
      args.origin === "artist"
        ? await ctx.db.get("songs", ctx.db.normalizeId("songs", source)!)
        : await ctx.db.get(
            "communityContributions",
            ctx.db.normalizeId("communityContributions", source)!
          )
    if (!row || row.status !== "published") return { counted: false }
    const owner =
      "ownerMemberId" in row ? row.ownerMemberId : row.authorMemberId
    if (
      owner === ctx.member._id ||
      !(await eligibleMember(
        ctx,
        owner,
        args.origin === "artist" ? "artist" : "fan"
      ))
    )
      return { counted: false }
    const day = Math.floor(Date.now() / DAY)
    const existing = await ctx.db
      .query("discoveryViews")
      .withIndex("by_viewer_member_id_and_source_id_and_day", (q) =>
        q
          .eq("viewerMemberId", ctx.member._id)
          .eq("sourceId", args.sourceId)
          .eq("day", day)
      )
      .unique()
    if (existing) return { counted: false }
    const limited = await limiter.limit(ctx, "discoveryView", {
      key: ctx.member._id,
    })
    if (!limited.ok) return { counted: false }
    const expiresAt = (day + 7) * DAY
    await ctx.db.insert("discoveryViews", {
      sourceId: args.sourceId,
      viewerMemberId: ctx.member._id,
      day,
      expiresAt,
    })
    await changeViews(ctx, args.sourceId, 1)
    await ctx.scheduler.runAt(
      expiresAt,
      internal.discovery.maintenance.expireViews,
      {}
    )
    return { counted: true }
  },
})
