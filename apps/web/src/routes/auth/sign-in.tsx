import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/components/backend-required"
import { PageShell } from "@/components/page-shell"
import { SignedOutOnly } from "@/components/signed-out-only"
import { SignInForm } from "@/components/sign-in-form"

export const Route = createFileRoute("/auth/sign-in")({
  component: SignInPage,
})

function SignInPage() {
  return (
    <PageShell>
      <BackendRequired>
        <SignedOutOnly>
          <SignInForm />
        </SignedOutOnly>
      </BackendRequired>
    </PageShell>
  )
}
