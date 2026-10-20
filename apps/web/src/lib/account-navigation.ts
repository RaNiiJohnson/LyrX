import type { MessageKey } from "@lyrx/shared"

export type AccountState =
  | "anonymous"
  | "email-unverified"
  | "onboarding-required"
  | "ready"
  | "suspended"

type AccountNavigation =
  | { kind: "anonymous" }
  | {
      kind: "authenticated"
      href: "/auth/verify-email" | "/onboarding" | "/profile"
      labelKey: MessageKey
    }

export function getAccountNavigation(state: AccountState): AccountNavigation {
  switch (state) {
    case "anonymous":
      return { kind: "anonymous" }
    case "email-unverified":
      return {
        kind: "authenticated",
        href: "/auth/verify-email",
        labelKey: "home.emailUnverifiedTitle",
      }
    case "onboarding-required":
      return {
        kind: "authenticated",
        href: "/onboarding",
        labelKey: "navigation.continue",
      }
    case "ready":
      return {
        kind: "authenticated",
        href: "/profile",
        labelKey: "navigation.myProfile",
      }
    case "suspended":
      return {
        kind: "authenticated",
        href: "/profile",
        labelKey: "navigation.account",
      }
  }
}

export function getSignedInDestination(
  state: AccountState
): "/auth/verify-email" | "/onboarding" | "/profile" | null {
  const navigation = getAccountNavigation(state)
  return navigation.kind === "authenticated" ? navigation.href : null
}
