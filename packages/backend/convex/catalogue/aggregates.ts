import { TableAggregate } from "@convex-dev/aggregate"
import { Triggers } from "convex-helpers/server/triggers"
import { v } from "convex/values"

import { components, internal } from "../_generated/api"
import type { DataModel, Id } from "../_generated/dataModel"
import { internalMutation } from "../_generated/server"
import { registerDiscoveryTriggers } from "../discovery/projection"

type CatalogueStatus = "draft" | "published"

export const songsByOwner = new TableAggregate<{
  Namespace: Id<"members">
  Key: number
  DataModel: DataModel
  TableName: "songs"
}>(components.catalogueSongs, {
  namespace: (song) => song.ownerMemberId,
  sortKey: (song) => song._creationTime,
})

export const songsByOwnerAndStatus = new TableAggregate<{
  Namespace: [Id<"members">, CatalogueStatus]
  Key: number
  DataModel: DataModel
  TableName: "songs"
}>(components.catalogueSongsByStatus, {
  namespace: (song) => [song.ownerMemberId, song.status],
  sortKey: (song) => song._creationTime,
})

export const albumsByOwner = new TableAggregate<{
  Namespace: Id<"members">
  Key: number
  DataModel: DataModel
  TableName: "albums"
}>(components.catalogueAlbums, {
  namespace: (album) => album.ownerMemberId,
  sortKey: (album) => album._creationTime,
})

export const albumsByOwnerAndStatus = new TableAggregate<{
  Namespace: [Id<"members">, CatalogueStatus]
  Key: number
  DataModel: DataModel
  TableName: "albums"
}>(components.catalogueAlbumsByStatus, {
  namespace: (album) => [album.ownerMemberId, album.status],
  sortKey: (album) => album._creationTime,
})

export const albumTracksByAlbum = new TableAggregate<{
  Namespace: Id<"albums">
  Key: number
  DataModel: DataModel
  TableName: "albumTracks"
}>(components.catalogueAlbumTracks, {
  namespace: (track) => track.albumId,
  sortKey: (track) => track.position,
})

export const catalogueAggregateTriggers = new Triggers<DataModel>()
registerDiscoveryTriggers(catalogueAggregateTriggers)
catalogueAggregateTriggers.register("songs", songsByOwner.idempotentTrigger())
catalogueAggregateTriggers.register(
  "songs",
  songsByOwnerAndStatus.idempotentTrigger()
)
catalogueAggregateTriggers.register("albums", albumsByOwner.idempotentTrigger())
catalogueAggregateTriggers.register(
  "albums",
  albumsByOwnerAndStatus.idempotentTrigger()
)
catalogueAggregateTriggers.register(
  "albumTracks",
  albumTracksByAlbum.idempotentTrigger()
)

const phaseValidator = v.union(
  v.literal("songs"),
  v.literal("albums"),
  v.literal("albumTracks")
)

export const backfill = internalMutation({
  args: {
    phase: phaseValidator,
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    phase: phaseValidator,
    migrated: v.number(),
    scheduledContinuation: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (args.phase === "songs") {
      const page = await ctx.db.query("songs").paginate({
        cursor: args.cursor,
        numItems: 25,
      })
      for (const document of page.page) {
        await songsByOwner.insertIfDoesNotExist(ctx, document)
        await songsByOwnerAndStatus.insertIfDoesNotExist(ctx, document)
      }
      if (!page.isDone) {
        await ctx.scheduler.runAfter(
          0,
          internal.catalogue.aggregates.backfill,
          {
            phase: "songs",
            cursor: page.continueCursor,
          }
        )
      } else {
        await ctx.scheduler.runAfter(
          0,
          internal.catalogue.aggregates.backfill,
          {
            phase: "albums",
            cursor: null,
          }
        )
      }
      return {
        phase: "songs" as const,
        migrated: page.page.length,
        scheduledContinuation: true,
      }
    }

    if (args.phase === "albums") {
      const page = await ctx.db.query("albums").paginate({
        cursor: args.cursor,
        numItems: 25,
      })
      for (const document of page.page) {
        await albumsByOwner.insertIfDoesNotExist(ctx, document)
        await albumsByOwnerAndStatus.insertIfDoesNotExist(ctx, document)
      }
      if (!page.isDone) {
        await ctx.scheduler.runAfter(
          0,
          internal.catalogue.aggregates.backfill,
          {
            phase: "albums",
            cursor: page.continueCursor,
          }
        )
      } else {
        await ctx.scheduler.runAfter(
          0,
          internal.catalogue.aggregates.backfill,
          {
            phase: "albumTracks",
            cursor: null,
          }
        )
      }
      return {
        phase: "albums" as const,
        migrated: page.page.length,
        scheduledContinuation: true,
      }
    }

    const page = await ctx.db.query("albumTracks").paginate({
      cursor: args.cursor,
      numItems: 25,
    })
    for (const document of page.page) {
      await albumTracksByAlbum.insertIfDoesNotExist(ctx, document)
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.catalogue.aggregates.backfill, {
        phase: "albumTracks",
        cursor: page.continueCursor,
      })
    }
    return {
      phase: "albumTracks" as const,
      migrated: page.page.length,
      scheduledContinuation: !page.isDone,
    }
  },
})
