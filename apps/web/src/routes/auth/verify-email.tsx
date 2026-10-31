import { createFileRoute } from "@tanstack/react-router"

import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { VerifyEmailForm } from "@/features/auth/verify-email-form"

export const Route = createFileRoute("/auth/verify-email")({
  ...appRouteBoundaries,
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  return (
    <PageShell>
      <VerifyEmailForm />
    </PageShell>
  )
}
