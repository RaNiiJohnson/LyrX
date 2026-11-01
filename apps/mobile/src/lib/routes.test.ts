import { describe, expect, it } from "vitest"
import { nativeHref, safeExternalUrl } from "./routes"

describe("nativeHref", () => {
  it("keeps song and community routes", () => {
    expect(nativeHref("/songs/abc123")).toBe("/songs/abc123")
    expect(nativeHref("/community/abc123")).toBe("/community/abc123")
  })

  it("returns null for screens not built yet or malformed paths", () => {
    expect(nativeHref("/albums/abc")).toBeNull()
    expect(nativeHref("/artists/mpanakanto")).toBeNull()
    expect(nativeHref("/songs/abc/edit")).toBeNull()
    expect(nativeHref("https://evil.example/songs/abc")).toBeNull()
  })
})

describe("safeExternalUrl", () => {
  it("allows HTTPS only", () => {
    expect(safeExternalUrl("https://open.spotify.com/track/1")).toBe(
      "https://open.spotify.com/track/1"
    )
    expect(safeExternalUrl("http://example.com")).toBeNull()
    expect(safeExternalUrl("intent://scan#Intent;end")).toBeNull()
    expect(safeExternalUrl("nope")).toBeNull()
  })
})
