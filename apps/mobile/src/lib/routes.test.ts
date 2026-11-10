import { describe, expect, it } from "vitest"
import { nativeHref, safeExternalUrl } from "./routes"

describe("nativeHref", () => {
  it("keeps the routes that have a native screen", () => {
    expect(nativeHref("/songs/abc123")).toBe("/songs/abc123")
    expect(nativeHref("/community/abc123")).toBe("/community/abc123")
    expect(nativeHref("/albums/abc")).toBe("/albums/abc")
    expect(nativeHref("/artists/mpanakanto")).toBe("/artists/mpanakanto")
    expect(nativeHref("/profiles/fan_1")).toBe("/profiles/fan_1")
  })

  it("returns null for screens not built yet or malformed paths", () => {
    expect(nativeHref("/studio/songs")).toBeNull()
    expect(nativeHref("/artists/a/b")).toBeNull()
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
