import { ConvexError } from "convex/values"
import type { GenericQueryCtx, GenericMutationCtx } from "convex/server"

import type { DataModel, Doc } from "../_generated/dataModel"

type DatabaseCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>

export async function requireVerifiedIdentity(ctx: DatabaseCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Une connexion est nécessaire.",
    })
  }
  if (identity.emailVerified !== true || typeof identity.email !== "string") {
    throw new ConvexError({
      code: "EMAIL_NOT_VERIFIED",
      message: "L’adresse email doit être vérifiée.",
    })
  }
  return { ...identity, email: identity.email, emailVerified: true as const }
}

export async function findMemberByIdentity(ctx: DatabaseCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

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
      message: "Ce compte est suspendu.",
    })
  }
  if (!member.emailVerified) {
    throw new ConvexError({
      code: "EMAIL_NOT_VERIFIED",
      message: "L’adresse email doit être vérifiée.",
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
      message: "Le profil doit être créé avant cette action.",
    })
  }
  return assertActiveMember(member)
}

export async function requireActiveArtist(ctx: DatabaseCtx) {
  const member = await requireActiveMember(ctx)
  if (member.role !== "artist") {
    throw new ConvexError({
      code: "ARTIST_REQUIRED",
      message: "Un compte artiste est nécessaire.",
    })
  }
  return member
}

export async function requireAdmin(ctx: DatabaseCtx) {
  const member = await requireActiveMember(ctx)
  if (!member.isAdmin) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Les droits administrateur sont nécessaires.",
    })
  }
  return member
}
