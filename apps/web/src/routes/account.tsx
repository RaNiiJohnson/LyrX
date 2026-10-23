import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { AccountLanding } from "@/features/account/account-landing"

export const Route = createFileRoute("/account")({
  ...appRouteBoundaries,
  component: AccountPage,
})

function AccountPage() {
  return (
    <PageShell>
      <BackendRequired>
        <AccountLanding />
      </BackendRequired>
    </PageShell>
  )
}
