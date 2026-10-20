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
    ["email-unverified", "/auth/verify-email", "home.emailUnverifiedTitle"],
    ["onboarding-required", "/onboarding", "navigation.continue"],
    ["ready", "/profile", "navigation.myProfile"],
    ["suspended", "/profile", "navigation.account"],
  ] as const)(
    "replaces public auth actions for the %s state",
    (state, href, labelKey) => {
      expect(getAccountNavigation(state)).toEqual({
        kind: "authenticated",
        href,
        labelKey,
      })
      expect(getSignedInDestination(state)).toBe(href)
    }
  )
})
