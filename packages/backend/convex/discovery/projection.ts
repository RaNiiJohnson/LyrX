import { DirectAggregate } from "@convex-dev/aggregate"
import type { Triggers } from "convex-helpers/server/triggers"
import { components, internal } from "../_generated/api"
import type { DataModel, Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

type Entry = Doc<"discoveryEntries">
type EntryInput = Omit<Entry, "_id" | "_creationTime" | "recentViews">
export type Sort = "newest" | "title" | "popular"
export const publicIndex = new DirectAggregate<{
  Key: [number | string, number | string, string]
  Id: Id<"discoveryEntries">
  Namespace: string
}>(components.publicDiscovery)

export function namespace(
  kind: Entry["kind"],
  sort: Sort,
  origin = "*",
  genre = "*",
  owner?: string
) {
  return owner
    ? `${kind}|${sort}|owner:${owner}|${genre}`
    : `${kind}|${sort}|${origin}|${genre}`
}
function sortKey(entry: Entry, sort: Sort): [number | string, number | string, string] {
  if (sort === "title") return [entry.titleKey, 0, String(entry.sourceId)]
  if (sort === "popular") return [entry.recentViews, entry.publishedAt, String(entry.sourceId)]
  return [entry.publishedAt, 0, String(entry.sourceId)]
}
function positions(entry: Entry) {
  const scopes = [
    namespace(entry.kind, "newest"),
    namespace(entry.kind, "newest", "*", "*", entry.memberId),
  ]
  if (entry.kind === "song") {
    scopes.push(namespace(entry.kind, "newest", entry.origin))
    if (entry.genre)
      scopes.push(
        namespace(entry.kind, "newest", "*", entry.genre),
        namespace(entry.kind, "newest", entry.origin, entry.genre)
      )
    if (entry.genre)
      scopes.push(
        namespace(entry.kind, "newest", "*", entry.genre, entry.memberId)
      )
  }
  return scopes.flatMap((scope) =>
    (entry.kind === "song"
      ? (["newest", "title", "popular"] as const)
      : (["newest", "title"] as const)
    ).map((sort) => ({
      namespace: scope.replace("|newest|", `|${sort}|`),
      key: sortKey(entry, sort),
      id: entry._id,
    }))
  )
}
export async function putEntry(
  ctx: MutationCtx,
  input: EntryInput | null,
  sourceId: Entry["sourceId"]
) {
  const old = await ctx.db
    .query("discoveryEntries")
    .withIndex("by_source_id", (q) => q.eq("sourceId", sourceId))
    .unique()
  if (!input) {
    if (old) {
      for (const position of positions(old))
        await publicIndex.deleteIfExists(ctx, position)
      await ctx.db.delete("discoveryEntries", old._id)
    }
    return
  }
  if (
    old &&
    old.memberId === input.memberId &&
    old.kind === input.kind &&
    old.origin === input.origin &&
    old.titleKey === input.titleKey &&
    old.publishedAt === input.publishedAt &&
    old.genre === input.genre
  )
    return
  const score =
    input.kind === "song"
      ? await ctx.db
          .query("discoveryScores")
          .withIndex("by_source_id", (q) =>
            q.eq(
              "sourceId",
              input.sourceId as Id<"songs"> | Id<"communityContributions">
            )
          )
          .unique()
      : null
  const values = { ...input, recentViews: score?.recentViews ?? 0 }
  if (old) {
    for (const position of positions(old))
      await publicIndex.deleteIfExists(ctx, position)
    await ctx.db.replace("discoveryEntries", old._id, values)
  } else await ctx.db.insert("discoveryEntries", values)
  const entry = await ctx.db
    .query("discoveryEntries")
    .withIndex("by_source_id", (q) => q.eq("sourceId", sourceId))
    .unique()
  if (!entry) throw new Error("Public projection could not be created.")
  for (const position of positions(entry))
    await publicIndex.insertIfDoesNotExist(ctx, position)
}
export async function changeViews(
  ctx: MutationCtx,
  sourceId: Id<"songs"> | Id<"communityContributions">,
  delta: number
) {
  const score = await ctx.db
    .query("discoveryScores")
    .withIndex("by_source_id", (q) => q.eq("sourceId", sourceId))
    .unique()
  const recentViews = Math.max(0, (score?.recentViews ?? 0) + delta)
  if (score) await ctx.db.patch("discoveryScores", score._id, { recentViews })
  else if (recentViews)
    await ctx.db.insert("discoveryScores", { sourceId, recentViews })
  const old = await ctx.db
    .query("discoveryEntries")
    .withIndex("by_source_id", (q) => q.eq("sourceId", sourceId))
    .unique()
  if (!old) return
  const next = { ...old, recentViews }
  const before = positions(old).filter((position) =>
    position.namespace.includes("|popular|")
  )
  const after = positions(next).filter((position) =>
    position.namespace.includes("|popular|")
  )
  for (let i = 0; i < before.length; i++) {
    const current = before[i],
      replacement = after[i]
    await publicIndex.replaceOrInsert(ctx, current, replacement)
  }
  await ctx.db.patch("discoveryEntries", old._id, {
    recentViews: next.recentViews,
  })
}
export async function eligibleMember(
  ctx: QueryCtx | MutationCtx,
  id: Id<"members">,
  role?: "fan" | "artist"
) {
  const member = await ctx.db.get("members", id)
  if (
    !member ||
    member.status !== "active" ||
    !member.emailVerified ||
    (role && member.role !== role)
  )
    return null
  if (
    await ctx.db
      .query("accountDeletions")
      .withIndex("by_auth_user_id", (q) =>
        q.eq("authUserId", member.authUserId)
      )
      .unique()
  )
    return null
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_member_id", (q) => q.eq("memberId", id))
    .unique()
  return profile ? { member, profile } : null
}
export async function syncSong(
  ctx: MutationCtx,
  row: Doc<"songs"> | null,
  id: Id<"songs">
) {
  if (!row) await queueViewCleanup(ctx, id)
  const eligible =
    row?.status === "published" &&
    (await eligibleMember(ctx, row.ownerMemberId, "artist"))
  await putEntry(
    ctx,
    row && eligible
      ? {
          sourceId: id,
          memberId: row.ownerMemberId,
          kind: "song",
          origin: "artist",
          titleKey: row.title.toLocaleLowerCase(),
          publishedAt: row.firstPublishedAt ?? row.createdAt,
          ...(row.genre ? { genre: row.genre } : {}),
        }
      : null,
    id
  )
}
export async function syncContribution(
  ctx: MutationCtx,
  row: Doc<"communityContributions"> | null,
  id: Id<"communityContributions">
) {
  if (!row) await queueViewCleanup(ctx, id)
  const eligible =
    row?.status === "published" &&
    (await eligibleMember(ctx, row.authorMemberId, "fan"))
  await putEntry(
    ctx,
    row && eligible
      ? {
          sourceId: id,
          memberId: row.authorMemberId,
          kind: "song",
          origin: "community",
          titleKey: row.title.toLocaleLowerCase(),
          publishedAt: row.firstPublishedAt,
          ...(row.genre ? { genre: row.genre } : {}),
        }
      : null,
    id
  )
}
async function queueViewCleanup(ctx: MutationCtx, sourceId: Id<"songs"> | Id<"communityContributions">) {
  const score = await ctx.db.query("discoveryScores").withIndex("by_source_id", (q) => q.eq("sourceId", sourceId)).unique()
  if (score) await ctx.db.delete("discoveryScores", score._id)
  const first = await ctx.db.query("discoveryViews").withIndex("by_source_id", (q) => q.eq("sourceId", sourceId)).first()
  if (!first) return
  const existing = await ctx.db.query("discoveryViewCleanup").withIndex("by_source_id", (q) => q.eq("sourceId", sourceId)).unique()
  if (!existing) await ctx.db.insert("discoveryViewCleanup", { sourceId })
  await ctx.scheduler.runAfter(0, internal.discovery.maintenance.cleanSourceViews, { sourceId })
}
export async function syncAlbum(
  ctx: MutationCtx,
  row: Doc<"albums"> | null,
  id: Id<"albums">
) {
  const eligible =
    row?.status === "published" &&
    (await eligibleMember(ctx, row.ownerMemberId, "artist"))
  await putEntry(
    ctx,
    row && eligible
      ? {
          sourceId: id,
          memberId: row.ownerMemberId,
          kind: "album",
          titleKey: row.title.toLocaleLowerCase(),
          publishedAt: row.firstPublishedAt ?? row.createdAt,
          ...(row.genre ? { genre: row.genre } : {}),
        }
      : null,
    id
  )
}
export async function syncArtist(ctx: MutationCtx, id: Id<"members">) {
  const eligible = await eligibleMember(ctx, id, "artist")
  await putEntry(
    ctx,
    eligible
      ? {
          sourceId: id,
          memberId: id,
          kind: "artist",
          titleKey: eligible.profile.displayName.toLocaleLowerCase(),
          publishedAt: eligible.member.createdAt,
        }
      : null,
    id
  )
}
export async function queueOwnerRefresh(
  ctx: MutationCtx,
  memberId: Id<"members">
) {
  const existing = await ctx.db
    .query("discoveryJobs")
    .withIndex("by_member_id", (q) => q.eq("memberId", memberId))
    .unique()
  if (existing) {
    // A second eligibility change can arrive after the first job passed songs.
    // Restart its durable cursor rather than publishing a partially stale index.
    await ctx.db.patch("discoveryJobs", existing._id, {
      phase: "songs",
      cursor: null,
      updatedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.discovery.maintenance.processJob, {
      jobId: existing._id,
    })
    return
  }
  const state = await ctx.db
    .query("discoveryState")
    .withIndex("by_key", (q) => q.eq("key", "public"))
    .unique()
  if (state)
    await ctx.db.patch("discoveryState", state._id, {
      pendingJobs: state.pendingJobs + 1,
    })
  else
    await ctx.db.insert("discoveryState", {
      key: "public",
      initialized: false,
      pendingJobs: 1,
    })
  const jobId = await ctx.db.insert("discoveryJobs", {
    memberId,
    phase: "songs",
    cursor: null,
    updatedAt: Date.now(),
  })
  await ctx.scheduler.runAfter(0, internal.discovery.maintenance.processJob, {
    jobId,
  })
}
export function registerDiscoveryTriggers(triggers: Triggers<DataModel>) {
  triggers.register("songs", async (ctx, change) =>
    syncSong(ctx, change.newDoc, change.id)
  )
  triggers.register("communityContributions", async (ctx, change) =>
    syncContribution(ctx, change.newDoc, change.id)
  )
  triggers.register("albums", async (ctx, change) =>
    syncAlbum(ctx, change.newDoc, change.id)
  )
  triggers.register("profiles", async (ctx, change) => {
    const memberId = change.newDoc?.memberId ?? change.oldDoc?.memberId
    if (!memberId) return
    await syncArtist(ctx, memberId)
    if (!change.newDoc) await queueOwnerRefresh(ctx, memberId)
    else if (!change.oldDoc) {
      const [song, contribution, album] = await Promise.all([
        ctx.db
          .query("songs")
          .withIndex("by_owner_member_id", (q) =>
            q.eq("ownerMemberId", memberId)
          )
          .first(),
        ctx.db
          .query("communityContributions")
          .withIndex("by_author_member_id", (q) =>
            q.eq("authorMemberId", memberId)
          )
          .first(),
        ctx.db
          .query("albums")
          .withIndex("by_owner_member_id", (q) =>
            q.eq("ownerMemberId", memberId)
          )
          .first(),
      ])
      if (song || contribution || album) await queueOwnerRefresh(ctx, memberId)
    }
  })
  triggers.register("members", async (ctx, change) => {
    const old = change.oldDoc,
      next = change.newDoc
    if (
      old &&
      (!next ||
        old.role !== next.role ||
        old.status !== next.status ||
        old.emailVerified !== next.emailVerified)
    )
      await queueOwnerRefresh(ctx, change.id)
    await syncArtist(ctx, change.id)
  })
}
