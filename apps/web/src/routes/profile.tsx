import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { ProfileEditor } from "@/features/profile/profile-editor"

export const Route = createFileRoute("/profile")({ component: ProfilePage })

function ProfilePage() {
  return (
    <PageShell>
      <BackendRequired>
        <ProfileEditor />
      </BackendRequired>
    </PageShell>
  )
}
