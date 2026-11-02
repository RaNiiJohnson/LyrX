import { describe, expect, it } from "vitest"
import { authErrorKey } from "./errors"

describe("authErrorKey", () => {
  it("maps Better Auth codes to localized messages", () => {
    expect(
      authErrorKey({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })
    ).toBe("error.invalidCredentials")
    expect(authErrorKey({ code: "EMAIL_NOT_VERIFIED", status: 403 })).toBe(
      "error.emailNotVerified"
    )
    expect(authErrorKey({ code: "USER_ALREADY_EXISTS", status: 422 })).toBe(
      "error.accountExists"
    )
  })

  it("falls back on status and transport failures", () => {
    expect(authErrorKey({ status: 429 })).toBe("error.rateLimited")
    expect(authErrorKey({ status: 503 })).toBe("error.server")
    expect(authErrorKey(new TypeError("Network request failed"))).toBe(
      "error.network"
    )
    expect(authErrorKey({ code: "SOMETHING_NEW", status: 400 })).toBe(
      "error.unexpected"
    )
    expect(authErrorKey(undefined)).toBe("error.unexpected")
  })
})
