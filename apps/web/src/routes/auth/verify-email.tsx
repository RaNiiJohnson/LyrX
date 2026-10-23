import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
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
      <BackendRequired>
        <VerifyEmailForm />
      </BackendRequired>
    </PageShell>
  )
}
