import { createFileRoute } from "@tanstack/react-router"

import { AccountLanding } from "@/components/account-landing"
import { BackendRequired } from "@/components/backend-required"
import { PageShell } from "@/components/page-shell"

export const Route = createFileRoute("/account")({
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
