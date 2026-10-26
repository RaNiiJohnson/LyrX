import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { ProfileEditor } from "@/features/profile/profile-editor"

export const Route = createFileRoute("/profile")({
  ...appRouteBoundaries,
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <PageShell width="wide">
      <BackendRequired>
        <ProfileEditor />
      </BackendRequired>
    </PageShell>
  )
}
