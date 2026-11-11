import { describe, expect, it } from "vitest"
import { appErrorKey, authErrorKey } from "./errors"

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

describe("appErrorKey", () => {
  it("reads the code of a ConvexError payload", () => {
    expect(appErrorKey({ data: { code: "HANDLE_TAKEN", message: "x" } })).toBe(
      "error.handleTaken"
    )
    expect(appErrorKey({ data: { code: "TOO_MANY_CUSTOM_LINKS" } })).toBe(
      "error.tooManyCustomLinks"
    )
  })

  it("maps the fan space codes", () => {
    const code = (value: string) => appErrorKey({ data: { code: value } })
    expect(code("SELF_REPORT_FORBIDDEN")).toBe("community.selfReportForbidden")
    expect(code("REVISION_CONFLICT")).toBe("community.revisionConflict")
    expect(code("NOTEBOOK_LIMIT")).toBe("notebook.limit")
    expect(code("NOTEBOOK_SOURCE_CHANGED")).toBe("notebook.sourceChanged")
    expect(code("FAN_REQUIRED")).toBe("community.fanOnly")
  })

  it("falls back on auth and transport rules", () => {
    expect(appErrorKey({ code: "INVALID_PASSWORD" })).toBe(
      "error.invalidCredentials"
    )
    expect(appErrorKey(new TypeError("Network request failed"))).toBe(
      "error.network"
    )
    expect(appErrorKey(new Error("boom"))).toBe("error.unexpected")
  })
})
