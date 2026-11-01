import { describe, expect, it } from "vitest"
import { parseConvexUrl } from "./config"

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
