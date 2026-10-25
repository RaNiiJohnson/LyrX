import { HOUR, RateLimiter } from "@convex-dev/rate-limiter"
import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"
import { ConvexError, v, type Infer } from "convex/values"
import { components } from "../_generated/api"
import type { Doc, Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { contributionInput } from "./model"

export function fail(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

export function boundedText(value: string, maximum: number, label: string) {
  const text = value.trim()
  if (!text || text.length > maximum)
    fail(
      "INVALID_INPUT",
      `${label} must contain between 1 and ${maximum} characters.`
    )
  return text
}

export function validatePageSize(options: { numItems: number }) {
  if (
    !Number.isInteger(options.numItems) ||
    options.numItems < 1 ||
    options.numItems > 50
  )
    fail("INVALID_INPUT", "Page size must be between 1 and 50.")
}

const inputValidator = v.object(contributionInput)
export function validatedContribution(input: Infer<typeof inputValidator>) {
  if (
    !input.lyricsText.trim() ||
    input.lyricsText.length > MAX_LYRICS_TEXT_LENGTH
  )
    fail(
      "INVALID_LYRICS",
      `Lyrics are required and must not exceed ${MAX_LYRICS_TEXT_LENGTH} characters.`
    )
  return {
    title: boundedText(input.title, 160, "Title"),
    primaryArtist: boundedText(input.primaryArtist, 120, "Primary artist"),
    lyricsText: input.lyricsText,
    ...(input.albumTitle?.trim()
      ? { albumTitle: boundedText(input.albumTitle, 160, "Album title") }
      : {}),
  }
}

export const limiter = new RateLimiter(components.rateLimiter, {
  communityPublish: {
    kind: "token bucket",
    rate: 10,
    period: HOUR,
    capacity: 3,
  },
  communityEdit: { kind: "token bucket", rate: 30, period: HOUR, capacity: 10 },
  communityReport: {
    kind: "token bucket",
    rate: 10,
    period: HOUR,
    capacity: 3,
  },
})

export const contributorValidator = v.object({
  handle: v.string(),
  displayName: v.string(),
})
export const summaryValidator = v.object({
  id: v.id("communityContributions"),
  title: v.string(),
  primaryArtist: v.string(),
  firstPublishedAt: v.number(),
  contributor: contributorValidator,
})
export const publicValidator = v.object({
  ...summaryValidator.fields,
  lyricsText: v.string(),
  albumTitle: v.optional(v.string()),
  revision: v.number(),
})

export async function activeContributor(
  ctx: QueryCtx,
  authorMemberId: Id<"members">
) {
  const member = await ctx.db.get("members", authorMemberId)
  if (!member || member.status !== "active" || !member.emailVerified)
    return null
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_member_id", (q) => q.eq("memberId", authorMemberId))
    .unique()
  return profile
    ? { handle: profile.handle, displayName: profile.displayName }
    : null
}

export async function publicSummary(
  ctx: QueryCtx,
  row: Doc<"communityContributions">
) {
  if (row.status !== "published") return null
  const contributor = await activeContributor(ctx, row.authorMemberId)
  return contributor
    ? {
        id: row._id,
        title: row.title,
        primaryArtist: row.primaryArtist,
        firstPublishedAt: row.firstPublishedAt,
        contributor,
      }
    : null
}
