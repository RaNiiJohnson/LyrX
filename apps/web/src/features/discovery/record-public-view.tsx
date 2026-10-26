import { useEffect, useRef } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"

/** Best-effort ranking telemetry must never block public lyric reading. */
export function RecordPublicView({
  origin,
  sourceId,
}: {
  origin: "artist" | "community"
  sourceId: Id<"songs"> | Id<"communityContributions">
}) {
  const current = useQuery(api.members.current, {})
  const record = useMutation(api.discovery.views.recordView)
  const attempted = useRef<string | null>(null)
  const viewerId = current?.state === "ready" ? current.member._id : null
  useEffect(() => {
    const key = `${viewerId}:${origin}:${sourceId}`
    if (!viewerId || attempted.current === key) return
    attempted.current = key
    // The server chooses the viewer, deduplicates daily and rejects own views.
    // A failed analytics request is not a failed content read.
    void record({ origin, sourceId }).catch(() => undefined)
  }, [origin, sourceId, viewerId, record])
  return null
}
