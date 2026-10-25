import { describe, expect, it, vi } from "vitest"

import {
  deleteConfirmedAccount,
  signOutForAccountDeletion,
} from "./delete-account"

const confirmed = {
  confirmation: "SUPPRIMER",
  confirmationWord: "SUPPRIMER",
  password: "",
}

function dependencies() {
  return {
    deleteUser: vi.fn(() =>
      Promise.resolve({
        data: { success: true, message: "User deleted" },
        error: null,
      })
    ),
    redirect: vi.fn(),
  }
}

describe("self-service account deletion", () => {
  it.each(["", "supprimer", "DELETE", "oui"])(
    "never sends a deletion request without the exact confirmation: %s",
    async (confirmation) => {
      const deps = dependencies()
      expect(
        await deleteConfirmedAccount({ ...confirmed, confirmation }, deps)
      ).toBe("confirmation-required")
      expect(deps.deleteUser).not.toHaveBeenCalled()
      expect(deps.redirect).not.toHaveBeenCalled()
    }
  )

  it("allows a fresh-session or Google deletion without a password", async () => {
    const deps = dependencies()
    expect(await deleteConfirmedAccount(confirmed, deps)).toBe("deleted")
    expect(deps.deleteUser).toHaveBeenCalledWith({})
    expect(deps.redirect).toHaveBeenCalledExactlyOnceWith()
  })

  it("preserves a provided password exactly and supports English confirmation", async () => {
    const deps = dependencies()
    await deleteConfirmedAccount(
      {
        confirmation: "DELETE",
        confirmationWord: "DELETE",
        password: " spaces ",
      },
      deps
    )
    expect(deps.deleteUser).toHaveBeenCalledWith({ password: " spaces " })
    expect(deps.redirect).toHaveBeenCalledOnce()
  })

  it.each([
    ["SESSION_EXPIRED", "reauth-required"],
    ["SESSION_NOT_FRESH", "reauth-required"],
    ["UNAUTHORIZED", "reauth-required"],
    ["INVALID_PASSWORD", "invalid-password"],
    ["CREDENTIAL_ACCOUNT_NOT_FOUND", "no-password-account"],
    ["INTERNAL_SERVER_ERROR", "failed"],
  ])(
    "keeps the page on %s without assuming deletion",
    async (code, expected) => {
      const redirect = vi.fn()
      const result = await deleteConfirmedAccount(confirmed, {
        deleteUser: () => Promise.resolve({ error: { code } }),
        redirect,
      })
      expect(result).toBe(expected)
      expect(redirect).not.toHaveBeenCalled()
    }
  )

  it.each([
    {},
    { data: null },
    { data: { success: false, message: "User deleted" } },
    { data: { success: true, message: "Verification email sent" } },
  ])(
    "does not redirect on an ambiguous or non-final response",
    async (response) => {
      const redirect = vi.fn()
      expect(
        await deleteConfirmedAccount(confirmed, {
          deleteUser: () => Promise.resolve(response),
          redirect,
        })
      ).toBe("failed")
      expect(redirect).not.toHaveBeenCalled()
    }
  )

  it("keeps an uncertain network failure local without exposing provider prose", async () => {
    const redirect = vi.fn()
    const result = await deleteConfirmedAccount(confirmed, {
      deleteUser: () =>
        Promise.reject(new Error("Raw provider or network detail")),
      redirect,
    })
    expect(result).toBe("failed")
    expect(redirect).not.toHaveBeenCalled()
  })
})

describe("fresh sign-in for account deletion", () => {
  it("only redirects to sign-in after native sign-out succeeds", async () => {
    const redirect = vi.fn()
    const signOut = vi.fn(() => Promise.resolve({ data: { success: true } }))
    expect(await signOutForAccountDeletion({ signOut, redirect })).toBe(true)
    expect(signOut).toHaveBeenCalledOnce()
    expect(redirect).toHaveBeenCalledOnce()
  })

  it.each([
    {},
    { data: { success: false } },
    { error: { code: "UNAUTHORIZED" } },
  ])(
    "keeps the current page if sign-out is not confirmed",
    async (response) => {
      const redirect = vi.fn()
      expect(
        await signOutForAccountDeletion({
          signOut: () => Promise.resolve(response),
          redirect,
        })
      ).toBe(false)
      expect(redirect).not.toHaveBeenCalled()
    }
  )

  it("does not redirect when sign-out throws", async () => {
    const redirect = vi.fn()
    expect(
      await signOutForAccountDeletion({
        signOut: () => Promise.reject(new Error("Network failure")),
        redirect,
      })
    ).toBe(false)
    expect(redirect).not.toHaveBeenCalled()
  })
})
