import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions"

import { mutation, query } from "../_generated/server"
import { catalogueAggregateTriggers } from "../catalogue/aggregates"
import {
  requireActiveArtist,
  requireActiveFan,
  requireActiveMember,
  requireAdmin,
  requireVerifiedIdentity,
} from "./authz"

export const verifiedQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    identity: await requireVerifiedIdentity(ctx),
  }))
)

export const verifiedMutation = customMutation(
  mutation,
  customCtx(async (ctx) =>
    catalogueAggregateTriggers.wrapDB({
      ...ctx,
      identity: await requireVerifiedIdentity(ctx),
    })
  )
)

export const memberQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    member: await requireActiveMember(ctx),
  }))
)

export const memberMutation = customMutation(
  mutation,
  customCtx(async (ctx) =>
    catalogueAggregateTriggers.wrapDB({
      ...ctx,
      member: await requireActiveMember(ctx),
    })
  )
)

export const artistQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    member: await requireActiveArtist(ctx),
  }))
)

export const artistMutation = customMutation(
  mutation,
  customCtx(async (ctx) =>
    catalogueAggregateTriggers.wrapDB({
      ...ctx,
      member: await requireActiveArtist(ctx),
    })
  )
)

export const fanQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ member: await requireActiveFan(ctx) }))
)
export const fanMutation = customMutation(
  mutation,
  customCtx(async (ctx) =>
    catalogueAggregateTriggers.wrapDB({
      ...ctx,
      member: await requireActiveFan(ctx),
    })
  )
)
export const adminQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ member: await requireAdmin(ctx) }))
)
export const adminMutation = customMutation(
  mutation,
  customCtx(async (ctx) =>
    catalogueAggregateTriggers.wrapDB({
      ...ctx,
      member: await requireAdmin(ctx),
    })
  )
)
