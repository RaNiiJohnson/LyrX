import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/components/backend-required"
import { PageShell } from "@/components/page-shell"
import { VerifyEmailForm } from "@/components/verify-email-form"

export const Route = createFileRoute("/auth/verify-email")({
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  return (
    <PageShell>
      <BackendRequired>
        <VerifyEmailForm />
      </BackendRequired>
    </PageShell>
  )
}
