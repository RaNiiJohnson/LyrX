import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import type { ProfileImageKind } from "../model"

export async function deleteOwnedProfileImageIfUnreferenced(
  ctx: Pick<MutationCtx, "db" | "storage">,
  args: {
    memberId: Id<"members">
    storageId: Id<"_storage">
    kind: ProfileImageKind
  }
) {
  const ownership = await ctx.db
    .query("profileImages")
    .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
    .unique()
  if (
    !ownership ||
    ownership.memberId !== args.memberId ||
    ownership.kind !== args.kind
  ) {
    return false
  }

  const attachedProfile = await ctx.db
    .query("profiles")
    .withIndex("by_avatar_storage_id", (q) =>
      q.eq("avatarStorageId", args.storageId)
    )
    .unique()
  const attachedArtistProfile = await ctx.db
    .query("artistProfiles")
    .withIndex("by_banner_storage_id", (q) =>
      q.eq("bannerStorageId", args.storageId)
    )
    .unique()
  if (attachedProfile || attachedArtistProfile) return false

  await ctx.db.delete("profileImages", ownership._id)
  await ctx.storage.delete(args.storageId)
  return true
}
