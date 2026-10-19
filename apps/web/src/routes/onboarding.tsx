import { createFileRoute } from "@tanstack/react-router"

import { BackendRequired } from "@/components/backend-required"
import { OnboardingForm } from "@/components/onboarding-form"
import { PageShell } from "@/components/page-shell"

export const Route = createFileRoute("/onboarding")({
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
