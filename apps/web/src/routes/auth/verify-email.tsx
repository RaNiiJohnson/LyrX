import { createFileRoute } from "@tanstack/react-router"

import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { VerifyEmailForm } from "@/features/auth/verify-email-form"

export const Route = createFileRoute("/auth/verify-email")({
  ...appRouteBoundaries,
  validateSearch: (search: Record<string, unknown>): { email?: string } =>
    typeof search.email === "string" && search.email.includes("@")
      ? { email: search.email }
      : {},
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { email } = Route.useSearch()
  return (
    <PageShell>
      <VerifyEmailForm email={email} />
    </PageShell>
  )
}
