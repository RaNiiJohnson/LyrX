import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/components/backend-required"
import { ForgotPasswordForm } from "@/components/forgot-password-form"
import { PageShell } from "@/components/page-shell"

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return (
    <PageShell>
      <BackendRequired>
        <ForgotPasswordForm />
      </BackendRequired>
    </PageShell>
  )
}
