import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { SignedOutOnly } from "@/features/auth/signed-out-only"
import { SignUpForm } from "@/features/auth/sign-up-form"

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <PageShell>
      <BackendRequired>
        <SignedOutOnly>
          <SignUpForm />
        </SignedOutOnly>
      </BackendRequired>
    </PageShell>
  )
}
