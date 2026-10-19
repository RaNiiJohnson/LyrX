import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/components/backend-required"
import { PageShell } from "@/components/page-shell"
import { SignInForm } from "@/components/sign-in-form"

export const Route = createFileRoute("/auth/sign-in")({
  component: SignInPage,
})

function SignInPage() {
  return (
    <PageShell>
      <BackendRequired>
        <SignInForm />
      </BackendRequired>
    </PageShell>
  )
}
