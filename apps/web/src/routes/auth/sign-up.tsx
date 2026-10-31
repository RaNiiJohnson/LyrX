import { createFileRoute } from "@tanstack/react-router"

import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { SignedOutOnly } from "@/features/auth/signed-out-only"
import { SignUpForm } from "@/features/auth/sign-up-form"
import { SignUpLayout } from "@/features/auth/sign-up-layout"

export const Route = createFileRoute("/auth/sign-up")({
  ...appRouteBoundaries,
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <PageShell width="wide">
      <SignedOutOnly>
        <SignUpLayout>
          <SignUpForm />
        </SignUpLayout>
      </SignedOutOnly>
    </PageShell>
  )
}
