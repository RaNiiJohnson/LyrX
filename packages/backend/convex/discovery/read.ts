import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server"
import { lyricsTextForSong } from "../catalogue/lyrics"
import { matchingExcerpt, searchTerms } from "./searchText"
import { ConvexError, v, type Infer } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import { query, type QueryCtx } from "../_generated/server"
import { songGenreValidator } from "../model"
import { normalizeHandle } from "../lib/validation"
import {
  albumCard,
  artistCard,
  origin,
  pageArgs,
  pageFields,
  songCard,
} from "./model"
import { eligibleMember, namespace, publicIndex, type Sort } from "./projection"

async function ready(ctx: QueryCtx) {
  const state = await ctx.db
    .query("discoveryState")
    .withIndex("by_key", (q) => q.eq("key", "public"))
    .unique()
  return state?.initialized === true && state.pendingJobs === 0
}
function pagination(
  args: { page: number; pageSize?: number; sort?: Sort },
  kind: "song" | "album" | "artist"
) {
  const pageSize = args.pageSize ?? 12
  if (
    !Number.isSafeInteger(args.page) ||
    args.page < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 24 ||
    (kind !== "song" && args.sort === "popular")
  )
    throw new ConvexError({
      code: "INVALID_INPUT",
      message: "Invalid catalogue page or sort.",
    })
  return {
    page: args.page,
    pageSize,
    sort: args.sort ?? (kind === "artist" ? "title" : "newest"),
  }
}
async function rows(
  ctx: QueryCtx,
  scope: string,
  page: number,
  size: number,
  sort: Sort
) {
  const total = await publicIndex.count(ctx, { namespace: scope })
  const pageCount = Math.ceil(total / size)
  const actualPage = Math.min(page, Math.max(1, pageCount))
  const start = (actualPage - 1) * size
  const length = Math.min(size, total - start)
  const offsets = Array.from({ length }, (_, index) => ({
    namespace: scope,
    offset: sort === "title" ? start + index : total - 1 - start - index,
  }))
  const positions = offsets.length
    ? await publicIndex.atBatch(ctx, offsets)
    : []
  const entries = await Promise.all(
    positions.map((position) => ctx.db.get("discoveryEntries", position.id))
  )
  return { total, pageCount, page: actualPage, pageSize: size, entries }
}
async function song(
  ctx: QueryCtx,
  entry: Doc<"discoveryEntries">
): Promise<Infer<typeof songCard> | null> {
  if (entry.kind !== "song" || !entry.origin) return null
  if (
    !(await eligibleMember(
      ctx,
      entry.memberId,
      entry.origin === "artist" ? "artist" : "fan"
    ))
  )
    return null
  const id =
    entry.origin === "artist"
      ? ctx.db.normalizeId("songs", entry.sourceId)
      : ctx.db.normalizeId("communityContributions", entry.sourceId)
  if (!id) return null
  const source =
    entry.origin === "artist"
      ? await ctx.db.get("songs", id as Id<"songs">)
      : await ctx.db.get(
          "communityContributions",
          id as Id<"communityContributions">
        )
  if (!source || source.status !== "published") return null
  return {
    id: String(source._id),
    origin: entry.origin,
    title: source.title,
    primaryArtist: source.primaryArtist,
    artworkUrl: source.artworkStorageId
      ? await ctx.storage.getUrl(source.artworkStorageId)
      : null,
    firstPublishedAt: entry.publishedAt,
    href:
      entry.origin === "artist"
        ? `/songs/${source._id}`
        : `/community/${source._id}`,
    ...(source.genre ? { genre: source.genre } : {}),
    recentViews: entry.recentViews,
  }
}
async function album(
  ctx: QueryCtx,
  entry: Doc<"discoveryEntries">
): Promise<Infer<typeof albumCard> | null> {
  const eligible = await eligibleMember(ctx, entry.memberId, "artist")
  const id = ctx.db.normalizeId("albums", entry.sourceId)
  if (!eligible || !id || entry.kind !== "album") return null
  const source = await ctx.db.get("albums", id)
  if (source?.status !== "published") return null
  return {
    id: String(id),
    title: source.title,
    artistName: eligible.profile.displayName,
    artistHandle: eligible.profile.handle,
    artworkUrl: source.artworkStorageId
      ? await ctx.storage.getUrl(source.artworkStorageId)
      : null,
    firstPublishedAt: entry.publishedAt,
    href: `/albums/${id}`,
  }
}
async function artist(
  ctx: QueryCtx,
  entry: Doc<"discoveryEntries">
): Promise<Infer<typeof artistCard> | null> {
  const eligible = await eligibleMember(ctx, entry.memberId, "artist")
  if (!eligible || entry.kind !== "artist") return null
  const counts = await publicIndex.countBatch(ctx, [
    { namespace: namespace("song", "newest", "*", "*", entry.memberId) },
    { namespace: namespace("album", "newest", "*", "*", entry.memberId) },
  ])
  return {
    handle: eligible.profile.handle,
    displayName: eligible.profile.displayName,
    avatarUrl: eligible.profile.avatarStorageId
      ? await ctx.storage.getUrl(eligible.profile.avatarStorageId)
      : null,
    songCount: counts.at(0) ?? 0,
    albumCount: counts.at(1) ?? 0,
    href: `/artists/${eligible.profile.handle}`,
  }
}
async function artistOwner(ctx: QueryCtx, handle: string | undefined) {
  if (handle === undefined) return undefined
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_handle_normalized", (q) =>
      q.eq("handleNormalized", normalizeHandle(handle))
    )
    .unique()
  return profile && (await eligibleMember(ctx, profile.memberId, "artist"))
    ? profile.memberId
    : null
}

export const listSongs = query({
  args: {
    ...pageArgs,
    origin: v.optional(origin),
    genre: v.optional(songGenreValidator),
    artistHandle: v.optional(v.string()),
  },
  returns: v.object({ ...pageFields, items: v.array(songCard) }),
  handler: async (ctx, args) => {
    const page = pagination(args, "song")
    const empty = {
      ready: false,
      total: 0,
      page: args.page,
      pageSize: page.pageSize,
      pageCount: 0,
      items: [],
    }
    if (!(await ready(ctx))) return empty
    const owner = await artistOwner(ctx, args.artistHandle)
    if (owner === null || (owner && args.origin === "community"))
      return { ...empty, ready: true, page: 1 }
    const result = await rows(
      ctx,
      namespace("song", page.sort, args.origin, args.genre, owner),
      page.page,
      page.pageSize,
      page.sort
    )
    const items = await Promise.all(
      result.entries.map((entry) => (entry ? song(ctx, entry) : null))
    )
    if (items.some((item) => item === null)) return empty
    return {
      ready: true,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      pageCount: result.pageCount,
      items: items.filter((item) => item !== null),
    }
  },
})
export const listAlbums = query({
  args: { ...pageArgs, artistHandle: v.optional(v.string()) },
  returns: v.object({ ...pageFields, items: v.array(albumCard) }),
  handler: async (ctx, args) => {
    const page = pagination(args, "album")
    const empty = {
      ready: false,
      total: 0,
      page: args.page,
      pageSize: page.pageSize,
      pageCount: 0,
      items: [],
    }
    if (!(await ready(ctx))) return empty
    const owner = await artistOwner(ctx, args.artistHandle)
    if (owner === null) return { ...empty, ready: true, page: 1 }
    const result = await rows(
      ctx,
      namespace("album", page.sort, "*", "*", owner),
      page.page,
      page.pageSize,
      page.sort
    )
    const items = await Promise.all(
      result.entries.map((entry) => (entry ? album(ctx, entry) : null))
    )
    if (items.some((item) => item === null)) return empty
    return {
      ready: true,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      pageCount: result.pageCount,
      items: items.filter((item) => item !== null),
    }
  },
})
export const listArtists = query({
  args: pageArgs,
  returns: v.object({ ...pageFields, items: v.array(artistCard) }),
  handler: async (ctx, args) => {
    const page = pagination(args, "artist")
    const empty = {
      ready: false,
      total: 0,
      page: args.page,
      pageSize: page.pageSize,
      pageCount: 0,
      items: [],
    }
    if (!(await ready(ctx))) return empty
    const result = await rows(
      ctx,
      namespace("artist", page.sort),
      page.page,
      page.pageSize,
      page.sort
    )
    const items = await Promise.all(
      result.entries.map((entry) => (entry ? artist(ctx, entry) : null))
    )
    if (items.some((item) => item === null)) return empty
    return {
      ready: true,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      pageCount: result.pageCount,
      items: items.filter((item) => item !== null),
    }
  },
})
export const home = query({
  args: {},
  returns: v.object({
    ready: v.boolean(),
    songs: v.array(songCard),
    popularSongs: v.array(songCard),
    albums: v.array(albumCard),
    artists: v.array(artistCard),
    rankingWindowDays: v.literal(7),
    countedAudience: v.literal("signed-in"),
  }),
  handler: async (ctx) => {
    const empty = {
      ready: false,
      songs: [],
      popularSongs: [],
      albums: [],
      artists: [],
      rankingWindowDays: 7 as const,
      countedAudience: "signed-in" as const,
    }
    if (!(await ready(ctx))) return empty
    const [songRows, popularRows, albumRows, artistRows] = await Promise.all([
      rows(ctx, namespace("song", "newest"), 1, 6, "newest"),
      rows(ctx, namespace("song", "popular"), 1, 6, "popular"),
      rows(ctx, namespace("album", "newest"), 1, 8, "newest"),
      rows(ctx, namespace("artist", "title"), 1, 8, "title"),
    ])
    const hydrate = async <T>(
      entries: Array<Doc<"discoveryEntries"> | null>,
      project: (
        ctx: QueryCtx,
        entry: Doc<"discoveryEntries">
      ) => Promise<T | null>
    ) =>
      Promise.all(entries.map((entry) => (entry ? project(ctx, entry) : null)))
    const [songs, popularSongs, albums, artists] = await Promise.all([
      hydrate(songRows.entries, song),
      hydrate(popularRows.entries, song),
      hydrate(albumRows.entries, album),
      hydrate(artistRows.entries, artist),
    ])
    if (
      [...songs, ...popularSongs, ...albums, ...artists].some(
        (item) => item === null
      )
    )
      return empty
    return {
      ...empty,
      ready: true,
      songs: songs.filter((item) => item !== null),
      popularSongs: popularSongs.filter((item) => item !== null),
      albums: albums.filter((item) => item !== null),
      artists: artists.filter((item) => item !== null),
    }
  },
})
export const artistByHandle = query({
  args: { handle: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      ready: v.boolean(),
      handle: v.string(),
      songCount: v.number(),
      albumCount: v.number(),
      songs: v.array(songCard),
      albums: v.array(albumCard),
    })
  ),
  handler: async (ctx, args) => {
    const owner = await artistOwner(ctx, args.handle)
    if (!owner) return null
    const empty = {
      ready: false,
      handle: args.handle,
      songCount: 0,
      albumCount: 0,
      songs: [],
      albums: [],
    }
    if (!(await ready(ctx))) return empty
    const [songRows, albumRows] = await Promise.all([
      rows(ctx, namespace("song", "newest", "*", "*", owner), 1, 6, "newest"),
      rows(ctx, namespace("album", "newest", "*", "*", owner), 1, 6, "newest"),
    ])
    const songs = await Promise.all(
      songRows.entries.map((entry) => (entry ? song(ctx, entry) : null))
    )
    const albums = await Promise.all(
      albumRows.entries.map((entry) => (entry ? album(ctx, entry) : null))
    )
    if ([...songs, ...albums].some((item) => item === null)) return empty
    return {
      ...empty,
      ready: true,
      songCount: songRows.total,
      albumCount: albumRows.total,
      songs: songs.filter((item) => item !== null),
      albums: albums.filter((item) => item !== null),
    }
  },
})

const searchItem = v.object({
  id: v.string(),
  kind: v.union(v.literal("song"), v.literal("album"), v.literal("artist")),
  title: v.string(),
  context: v.string(),
  href: v.string(),
  artworkUrl: v.union(v.string(), v.null()),
  origin: v.optional(origin),
  contributor: v.optional(v.string()),
  excerpt: v.union(v.string(), v.null()),
})

export const search = query({
  args: { text: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({
    ...paginationResultValidator(searchItem).fields,
    ready: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const text = args.text.trim()
    const terms = searchTerms(text)
    if (
      text.length > 200 ||
      terms.length < 1 ||
      terms.length > 16 ||
      terms.some((term) => term.length > 32) ||
      !Number.isInteger(args.paginationOpts.numItems) ||
      args.paginationOpts.numItems < 1 ||
      args.paginationOpts.numItems > 12
    )
      throw new ConvexError({
        code: "INVALID_INPUT",
        message:
          "Search requires 1–16 terms of at most 32 characters and pages of 1–12 items.",
      })
    const state = await ctx.db
      .query("discoveryState")
      .withIndex("by_key", (q) => q.eq("key", "public"))
      .unique()
    if (!state?.initialized || state.pendingJobs || state.searchVersion !== 1)
      return { ready: false, page: [], isDone: true, continueCursor: "" }
    const result = await ctx.db
      .query("discoveryEntries")
      .withSearchIndex("search_text", (q) => q.search("searchText", text))
      .paginate(args.paginationOpts)
    const page = []
    for (const entry of result.page) {
      // Hydrate from canonical data: a stale projection is never permission.
      if (entry.kind === "song") {
        if (!entry.origin) continue
        const source =
          entry.origin === "artist"
            ? await ctx.db.get("songs", entry.sourceId as Id<"songs">)
            : await ctx.db.get(
                "communityContributions",
                entry.sourceId as Id<"communityContributions">
              )
        if (!source || source.status !== "published") continue
        const owner = await eligibleMember(
          ctx,
          "ownerMemberId" in source
            ? source.ownerMemberId
            : source.authorMemberId,
          entry.origin === "artist" ? "artist" : "fan"
        )
        if (!owner) continue
        const lyrics =
          "ownerMemberId" in source
            ? await lyricsTextForSong(ctx, source)
            : source.lyricsText
        page.push({
          id: String(entry.sourceId),
          kind: entry.kind,
          title: source.title,
          context: source.primaryArtist,
          href:
            entry.origin === "artist"
              ? `/songs/${source._id}`
              : `/community/${source._id}`,
          artworkUrl: source.artworkStorageId
            ? await ctx.storage.getUrl(source.artworkStorageId)
            : null,
          origin: entry.origin,
          ...(entry.origin === "community"
            ? { contributor: owner.profile.displayName }
            : {}),
          excerpt: matchingExcerpt(lyrics, text),
        })
      } else if (entry.kind === "album") {
        const card = await album(ctx, entry)
        if (card)
          page.push({
            id: String(entry.sourceId),
            kind: entry.kind,
            title: card.title,
            context: card.artistName,
            href: card.href,
            artworkUrl: card.artworkUrl,
            excerpt: null,
          })
      } else {
        const card = await artist(ctx, entry)
        if (card)
          page.push({
            id: String(entry.sourceId),
            kind: entry.kind,
            title: card.displayName,
            context: `@${card.handle}`,
            href: card.href,
            artworkUrl: card.avatarUrl,
            excerpt: null,
          })
      }
    }
    // Preserve the native cursor even when visibility hydration shortens a page.
    return { ...result, page, ready: true }
  },
})
