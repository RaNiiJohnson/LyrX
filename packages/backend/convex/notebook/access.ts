import { lyricsTextForSong } from "../catalogue/lyrics"
import type { QueryCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"
import { publicSource, type SourceId } from "../interactions/access"
import { fail } from "../community/values"

export async function fingerprint(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

/** Check canonical publication and author eligibility before reading any lyrics. */
export async function sourceContent(ctx: QueryCtx, sourceId: SourceId) {
  const card = await publicSource(ctx, sourceId)
  if (!card) return null
  const songId = ctx.db.normalizeId("songs", sourceId)
  const row = songId
    ? await ctx.db.get("songs", songId)
    : await ctx.db.get(
        "communityContributions",
        sourceId as Id<"communityContributions">
      )
  if (!row) return null
  return {
    ...card,
    ownerId: "ownerMemberId" in row ? row.ownerMemberId : row.authorMemberId,
    lyricsText:
      "ownerMemberId" in row
        ? await lyricsTextForSong(ctx, row)
        : row.lyricsText,
    artworkUrl: row.artworkStorageId
      ? await ctx.storage.getUrl(row.artworkStorageId)
      : null,
  }
}

export async function ownCollection(
  ctx: QueryCtx,
  memberId: Id<"members">,
  id: Id<"notebookCollections"> | null
) {
  if (id === null) return
  const row = await ctx.db.get("notebookCollections", id)
  if (!row || row.memberId !== memberId)
    fail("NOT_FOUND", "Collection not found.")
  return row
}
export async function ownPassage(
  ctx: QueryCtx,
  memberId: Id<"members">,
  id: Id<"notebookPassages">
) {
  const row = await ctx.db.get("notebookPassages", id)
  if (!row || row.memberId !== memberId) fail("NOT_FOUND", "Passage not found.")
  return row
}
