import { ConvexError, v } from "convex/values"

import { internalMutation } from "./_generated/server"
import { normalizeEmail } from "./lib/validation"

export const bootstrapFirstAdmin = internalMutation({
  args: { email: v.string() },
  returns: v.id("members"),
  handler: async (ctx, args) => {
    const existingAdmin = await ctx.db
      .query("members")
      .withIndex("by_is_admin", (q) => q.eq("isAdmin", true))
      .first()
    if (existingAdmin) {
      throw new ConvexError({
        code: "ADMIN_ALREADY_EXISTS",
        message: "An administrator already exists.",
      })
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(args.email)))
      .unique()
    if (!member || !member.emailVerified || member.status !== "active") {
      throw new ConvexError({
        code: "ELIGIBLE_MEMBER_NOT_FOUND",
        message: "No active, verified member matches this email.",
      })
    }

    await ctx.db.patch("members", member._id, {
      isAdmin: true,
      updatedAt: Date.now(),
    })
    return member._id
  },
})

export const setAccountSuspension = internalMutation({
  args: {
    memberId: v.id("members"),
    suspended: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("members", args.memberId, {
      status: args.suspended ? "suspended" : "active",
      updatedAt: Date.now(),
    })
    return null
  },
})
