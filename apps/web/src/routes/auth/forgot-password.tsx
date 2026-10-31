import { createFileRoute } from "@tanstack/react-router"

import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form"

export const Route = createFileRoute("/auth/forgot-password")({
  ...appRouteBoundaries,
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return (
    <PageShell>
      <ForgotPasswordForm />
    </PageShell>
  )
}
