import { describe, expect, it } from "vitest"

import {
  getAccountNavigation,
  getSignedInDestination,
} from "./account-navigation"

describe("account navigation policy", () => {
  it("keeps sign-in and sign-up actions for anonymous visitors", () => {
    expect(getAccountNavigation("anonymous")).toEqual({
      kind: "anonymous",
    })
    expect(getSignedInDestination("anonymous")).toBeNull()
  })

  it.each([
    ["email-unverified", "/auth/verify-email", "Vérifier mon email"],
    ["onboarding-required", "/onboarding", "Continuer"],
    ["ready", "/profile", "Mon profil"],
    ["suspended", "/profile", "Mon compte"],
  ] as const)(
    "replaces public auth actions for the %s state",
    (state, href, label) => {
      expect(getAccountNavigation(state)).toEqual({
        kind: "authenticated",
        href,
        label,
      })
      expect(getSignedInDestination(state)).toBe(href)
    }
  )
})
