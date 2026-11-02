import { describe, expect, it } from "vitest"
import { convexSiteUrl, parseConvexUrl } from "./config"

describe("parseConvexUrl", () => {
  it("accepts https deployments and normalises to the origin", () => {
    expect(parseConvexUrl("https://happy-animal-123.convex.cloud/")).toBe(
      "https://happy-animal-123.convex.cloud"
    )
  })

  it("accepts the local backend", () => {
    expect(parseConvexUrl("http://127.0.0.1:3210")).toBe(
      "http://127.0.0.1:3210"
    )
  })

  it("rejects missing, malformed and insecure values", () => {
    expect(parseConvexUrl(undefined)).toBeNull()
    expect(parseConvexUrl("")).toBeNull()
    expect(parseConvexUrl("not a url")).toBeNull()
    expect(parseConvexUrl("http://example.com")).toBeNull()
  })
})

describe("convexSiteUrl", () => {
  it("maps cloud deployments to their HTTP actions host", () => {
    expect(convexSiteUrl("https://happy-animal-123.convex.cloud")).toBe(
      "https://happy-animal-123.convex.site"
    )
  })

  it("maps the local backend to its site proxy port", () => {
    expect(convexSiteUrl("http://127.0.0.1:3210")).toBe("http://127.0.0.1:3211")
  })

  it("has no auth host for unknown deployments", () => {
    expect(convexSiteUrl(null)).toBeNull()
    expect(convexSiteUrl("https://example.com")).toBeNull()
  })
})
