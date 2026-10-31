import { createFileRoute } from "@tanstack/react-router"

import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { SignedOutOnly } from "@/features/auth/signed-out-only"
import { SignInForm } from "@/features/auth/sign-in-form"

export const Route = createFileRoute("/auth/sign-in")({
  ...appRouteBoundaries,
  component: SignInPage,
})

function SignInPage() {
  return (
    <PageShell>
      <SignedOutOnly>
        <SignInForm />
      </SignedOutOnly>
    </PageShell>
  )
}
