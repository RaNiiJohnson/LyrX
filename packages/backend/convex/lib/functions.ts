import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions"

import { mutation, query } from "../_generated/server"
import { catalogueAggregateTriggers } from "../catalogueAggregates"
import {
  requireActiveArtist,
  requireActiveMember,
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
  customCtx(async (ctx) => ({
    identity: await requireVerifiedIdentity(ctx),
  }))
)

export const memberQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    member: await requireActiveMember(ctx),
  }))
)

export const memberMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({
    member: await requireActiveMember(ctx),
  }))
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
