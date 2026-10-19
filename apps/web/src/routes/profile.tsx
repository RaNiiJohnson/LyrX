import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/components/backend-required"
import { PageShell } from "@/components/page-shell"
import { ProfileEditor } from "@/components/profile-editor"

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
