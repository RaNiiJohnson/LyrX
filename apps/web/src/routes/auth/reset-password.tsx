import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/components/backend-required"
import { PageShell } from "@/components/page-shell"
import { ResetPasswordForm } from "@/components/reset-password-form"

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  return (
    <PageShell>
      <BackendRequired>
        <ResetPasswordForm token={token} />
      </BackendRequired>
    </PageShell>
  )
}
