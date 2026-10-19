import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/components/backend-required"
import { PageShell } from "@/components/page-shell"
import { SignUpForm } from "@/components/sign-up-form"

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <PageShell>
      <BackendRequired>
        <SignUpForm />
      </BackendRequired>
    </PageShell>
  )
}
