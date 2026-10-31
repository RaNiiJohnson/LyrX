import { createFileRoute } from "@tanstack/react-router"

import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { ResetPasswordForm } from "@/features/auth/reset-password-form"

export const Route = createFileRoute("/auth/reset-password")({
  ...appRouteBoundaries,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  return (
    <PageShell>
      <ResetPasswordForm token={token} />
    </PageShell>
  )
}
