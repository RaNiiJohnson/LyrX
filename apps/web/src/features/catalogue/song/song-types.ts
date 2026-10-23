import type { FunctionReturnType } from "convex/server"

import type { api } from "@lyrx/backend/convex/_generated/api"

export type SongDetail = NonNullable<
  FunctionReturnType<typeof api.catalogue.getMySong>
>
