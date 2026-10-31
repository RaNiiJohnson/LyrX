import { createFileRoute } from "@tanstack/react-router"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { CommentModeration } from "@/features/interactions/comment-moderation"

export const Route = createFileRoute("/admin/comments/")({
  ...appRouteBoundaries,
  component: () => (
    <PageShell>
      <CommentModeration />
    </PageShell>
  ),
})
