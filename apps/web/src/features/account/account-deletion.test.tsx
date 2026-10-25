import { renderToStaticMarkup } from "react-dom/server"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LocaleProvider } from "@/app/locale-provider"
import { ProfileEditor } from "@/features/profile/profile-editor"
import { AccountDeletion } from "./account-deletion"

const { currentQuery, deleteUser } = vi.hoisted(() => ({
  currentQuery: vi.fn(),
  deleteUser: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useQuery: currentQuery,
  useMutation: () => vi.fn(),
}))
vi.mock("@/lib/auth-client", () => ({ authClient: { deleteUser } }))
// Links need a router during hydration; this test checks signed-in state gating.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

describe("account deletion entry point", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders an irreversible warning and a dialog trigger without deleting", () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <AccountDeletion />
      </LocaleProvider>
    )
    expect(html).toContain("Supprimer mon compte")
    expect(html).toContain("Cette action est irréversible")
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).not.toContain('type="password"')
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it.each(["suspended", "onboarding-required", "email-unverified"])(
    "lets a signed-in %s account access its deletion settings",
    (state) => {
      currentQuery.mockReturnValue({ state })
      const html = renderToStaticMarkup(
        <LocaleProvider>
          <ProfileEditor />
        </LocaleProvider>
      )
      expect(html).toContain("Supprimer mon compte")
      expect(deleteUser).not.toHaveBeenCalled()
    }
  )

  it.each(["fan", "artist"])(
    "offers deletion after the %s profile form",
    (role) => {
      currentQuery.mockReturnValue({
        state: "ready",
        member: { role, isAdmin: false },
        profile: { handle: "test-profile", displayName: "Test profile" },
        artistProfile: null,
      })
      const html = renderToStaticMarkup(
        <LocaleProvider>
          <ProfileEditor />
        </LocaleProvider>
      )
      expect(html).toContain('id="handle"')
      expect(html).toContain("Supprimer mon compte")
      expect(deleteUser).not.toHaveBeenCalled()
    }
  )

  it.each([undefined, { state: "anonymous" }])(
    "does not offer account deletion while loading or signed out",
    (current) => {
      currentQuery.mockReturnValue(current)
      const html = renderToStaticMarkup(
        <LocaleProvider>
          <ProfileEditor />
        </LocaleProvider>
      )
      expect(html).not.toContain("Supprimer mon compte")
      expect(deleteUser).not.toHaveBeenCalled()
    }
  )
})
