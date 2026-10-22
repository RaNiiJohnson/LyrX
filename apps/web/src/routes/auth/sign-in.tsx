import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { SignedOutOnly } from "@/features/auth/signed-out-only"
import { SignInForm } from "@/features/auth/sign-in-form"

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
