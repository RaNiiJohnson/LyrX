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
      label: string
    }

export function getAccountNavigation(state: AccountState): AccountNavigation {
  switch (state) {
    case "anonymous":
      return { kind: "anonymous" }
    case "email-unverified":
      return {
        kind: "authenticated",
        href: "/auth/verify-email",
        label: "Vérifier mon email",
      }
    case "onboarding-required":
      return {
        kind: "authenticated",
        href: "/onboarding",
        label: "Continuer",
      }
    case "ready":
      return {
        kind: "authenticated",
        href: "/profile",
        label: "Mon profil",
      }
    case "suspended":
      return {
        kind: "authenticated",
        href: "/profile",
        label: "Mon compte",
      }
  }
}

export function getSignedInDestination(
  state: AccountState
): "/auth/verify-email" | "/onboarding" | "/profile" | null {
  const navigation = getAccountNavigation(state)
  return navigation.kind === "authenticated" ? navigation.href : null
}
