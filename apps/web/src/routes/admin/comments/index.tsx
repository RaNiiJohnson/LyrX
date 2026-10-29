import { createFileRoute } from "@tanstack/react-router"
import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { CommentModeration } from "@/features/interactions/comment-moderation"

export const Route = createFileRoute("/admin/comments/")({
  ...appRouteBoundaries,
  component: () => (
    <PageShell>
      <BackendRequired>
        <CommentModeration />
      </BackendRequired>
    </PageShell>
  ),
})
