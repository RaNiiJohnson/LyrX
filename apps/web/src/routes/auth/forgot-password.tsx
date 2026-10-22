import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form"

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
