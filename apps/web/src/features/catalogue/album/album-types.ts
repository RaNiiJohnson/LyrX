import type { FunctionReturnType } from "convex/server"

import type { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

import type { SongGenre } from "@/features/catalogue/lib/catalogue-form"

export type AlbumDetail = NonNullable<
  FunctionReturnType<typeof api.catalogue.read.getMyAlbum>
>
export type SongSummary = FunctionReturnType<
  typeof api.catalogue.read.listMySongs
>["page"][number]
export type AlbumFormValues = {
  title: string
  releaseDate: string
  description: string
  genre: "" | SongGenre
  otherGenre: string
  label: string
  credits: string
  trackIds: Array<Id<"songs">>
}
