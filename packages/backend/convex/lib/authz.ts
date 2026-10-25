import { ConvexError } from "convex/values"
import type { GenericQueryCtx, GenericMutationCtx } from "convex/server"

import type { DataModel, Doc } from "../_generated/dataModel"

type DatabaseCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>

export async function isDeletedIdentity(ctx: DatabaseCtx, authUserId: string) {
  return Boolean(
    await ctx.db
      .query("accountDeletions")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
      .unique()
  )
}

export async function requireVerifiedIdentity(ctx: DatabaseCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity || (await isDeletedIdentity(ctx, identity.tokenIdentifier))) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Sign-in is required.",
    })
  }
  if (identity.emailVerified !== true || typeof identity.email !== "string") {
    throw new ConvexError({
      code: "EMAIL_NOT_VERIFIED",
      message: "The email address must be verified.",
    })
  }
  return { ...identity, email: identity.email, emailVerified: true as const }
}

export async function findMemberByIdentity(ctx: DatabaseCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity || (await isDeletedIdentity(ctx, identity.tokenIdentifier))) {
    return null
  }

  const member = await ctx.db
    .query("members")
    .withIndex("by_auth_user_id", (q) =>
      q.eq("authUserId", identity.tokenIdentifier)
    )
    .unique()

  return { identity, member }
}

export function assertActiveMember(member: Doc<"members">) {
  if (member.status === "suspended") {
    throw new ConvexError({
      code: "ACCOUNT_SUSPENDED",
      message: "This account is suspended.",
    })
  }
  if (!member.emailVerified) {
    throw new ConvexError({
      code: "EMAIL_NOT_VERIFIED",
      message: "The email address must be verified.",
    })
  }
  return member
}

export async function requireActiveMember(ctx: DatabaseCtx) {
  const identity = await requireVerifiedIdentity(ctx)
  const member = await ctx.db
    .query("members")
    .withIndex("by_auth_user_id", (q) =>
      q.eq("authUserId", identity.tokenIdentifier)
    )
    .unique()

  if (!member) {
    throw new ConvexError({
      code: "ONBOARDING_REQUIRED",
      message: "Complete onboarding before performing this action.",
    })
  }
  return assertActiveMember(member)
}

export async function requireActiveArtist(ctx: DatabaseCtx) {
  const member = await requireActiveMember(ctx)
  if (member.role !== "artist") {
    throw new ConvexError({
      code: "ARTIST_REQUIRED",
      message: "An artist account is required.",
    })
  }
  return member
}

export async function requireAdmin(ctx: DatabaseCtx) {
  const member = await requireActiveMember(ctx)
  if (!member.isAdmin) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Administrator privileges are required.",
    })
  }
  return member
}
