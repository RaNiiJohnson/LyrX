import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/app/backend-required"
import { PageShell } from "@/app/page-shell"
import { appRouteBoundaries } from "@/app/route-states"
import { OnboardingForm } from "@/features/onboarding/onboarding-form"

export const Route = createFileRoute("/onboarding")({
  ...appRouteBoundaries,
  component: OnboardingPage,
})

function OnboardingPage() {
  return (
    <PageShell>
      <BackendRequired>
        <OnboardingForm />
      </BackendRequired>
    </PageShell>
  )
}
