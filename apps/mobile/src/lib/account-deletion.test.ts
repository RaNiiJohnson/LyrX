import { describe, expect, it, vi } from "vitest"
import { deleteConfirmedAccount } from "./account-deletion"

const values = { confirmation: "SUPPRIMER", confirmationWord: "SUPPRIMER" }

describe("deleteConfirmedAccount", () => {
  it("does not call the server without the typed word", async () => {
    const deleteUser = vi.fn()
    expect(
      await deleteConfirmedAccount(
        { confirmation: "oui", confirmationWord: "SUPPRIMER", password: "" },
        deleteUser
      )
    ).toBe("confirmation-required")
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it("only reports deleted on the explicit server confirmation", async () => {
    const ok = vi.fn().mockResolvedValue({
      data: { success: true, message: "User deleted" },
    })
    expect(
      await deleteConfirmedAccount({ ...values, password: "pw" }, ok)
    ).toBe("deleted")
    expect(ok).toHaveBeenCalledWith({ password: "pw" })
    expect(
      await deleteConfirmedAccount(
        { ...values, password: "" },
        vi.fn().mockResolvedValue({ data: { success: true } })
      )
    ).toBe("failed")
  })

  it("maps server errors and thrown failures", async () => {
    const outcome = (code: string) =>
      deleteConfirmedAccount(
        { ...values, password: "" },
        vi.fn().mockResolvedValue({ error: { code } })
      )
    expect(await outcome("SESSION_NOT_FRESH")).toBe("reauth-required")
    expect(await outcome("INVALID_PASSWORD")).toBe("invalid-password")
    expect(await outcome("CREDENTIAL_ACCOUNT_NOT_FOUND")).toBe(
      "no-password-account"
    )
    expect(await outcome("OTHER")).toBe("failed")
    expect(
      await deleteConfirmedAccount(
        { ...values, password: "" },
        vi.fn().mockRejectedValue(new Error("offline"))
      )
    ).toBe("failed")
  })
})
