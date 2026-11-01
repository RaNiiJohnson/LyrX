import { v, type Infer } from "convex/values"
import { validShareRange } from "@lyrx/shared"
import type { Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { memberQuery } from "./lib/functions"
import { sourceId } from "./interactions/model"
import { fingerprint, ownPassage, sourceContent } from "./notebook/access"
import { fail } from "./community/values"

const target = v.union(
  v.object({ kind: v.literal("song"), sourceId }),
  v.object({ kind: v.literal("passage"), passageId: v.id("notebookPassages") })
)
const readyContext = v.object({
  state: v.literal("ready"),
  text: v.string(),
  version: v.string(),
  title: v.string(),
  primaryArtist: v.string(),
  href: v.string(),
  hasArtwork: v.boolean(),
})
const changedContext = v.object({
  state: v.literal("changed"),
  href: v.string(),
})
const card = v.object({
  text: v.string(),
  title: v.string(),
  primaryArtist: v.string(),
  version: v.string(),
  artworkId: v.union(v.id("_storage"), v.null()),
  artworkUrl: v.union(v.string(), v.null()),
})

async function resolve(
  ctx: QueryCtx,
  memberId: Id<"members">,
  value: Infer<typeof target>
) {
  const passage =
    value.kind === "passage"
      ? await ownPassage(ctx, memberId, value.passageId)
      : null
  if (passage && !passage.snapshot) return null
  const id = value.kind === "song" ? value.sourceId : passage!.sourceId
  const source = await sourceContent(ctx, id)
  if (!source) return null
  const version = await fingerprint(source.lyricsText)
  if (passage?.snapshot && passage.snapshot.fingerprint !== version)
    return { state: "changed" as const, href: source.href }
  const official = ctx.db.normalizeId("songs", id)
  const row = official
    ? await ctx.db.get("songs", official)
    : await ctx.db.get(
        "communityContributions",
        id as Id<"communityContributions">
      )
  const artworkId = row?.artworkStorageId ?? null
  return {
    state: "ready" as const,
    text: passage?.snapshot?.text ?? source.lyricsText,
    version,
    title: source.title,
    primaryArtist: source.primaryArtist,
    href: source.href,
    artworkId,
    artworkUrl: source.artworkUrl,
  }
}

/** Live eligibility/version context; no private notebook IDs or snapshots leak. */
export const context = memberQuery({
  args: { target },
  returns: v.union(v.null(), readyContext, changedContext),
  handler: async (ctx, args) => {
    const result = await resolve(ctx, ctx.member._id, args.target)
    if (!result || result.state === "changed") return result
    return {
      state: result.state,
      text: result.text,
      version: result.version,
      title: result.title,
      primaryArtist: result.primaryArtist,
      href: result.href,
      hasArtwork: result.artworkId !== null && result.artworkUrl !== null,
    }
  },
})

/** Also called fresh before download; the client never supplies card text or URLs. */
export const prepare = memberQuery({
  args: {
    target,
    start: v.number(),
    end: v.number(),
    version: v.string(),
    withArtwork: v.boolean(),
  },
  returns: v.union(v.null(), card),
  handler: async (ctx, args) => {
    const source = await resolve(ctx, ctx.member._id, args.target)
    if (!source || source.state !== "ready" || source.version !== args.version)
      return null
    if (!validShareRange(source.text, args.start, args.end))
      fail(
        "SHARE_RANGE",
        "Select a short nonempty passage without splitting Unicode characters."
      )
    return {
      text: source.text.slice(args.start, args.end),
      title: source.title,
      primaryArtist: source.primaryArtist,
      version: source.version,
      artworkId:
        args.withArtwork && source.artworkUrl ? source.artworkId : null,
      artworkUrl: args.withArtwork ? source.artworkUrl : null,
    }
  },
})
