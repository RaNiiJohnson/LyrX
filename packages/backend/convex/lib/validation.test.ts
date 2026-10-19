import { describe, expect, it } from "vitest"

import {
  validateCustomLinks,
  validateHandle,
  validateProfileImageMetadata,
  validateSocialUrl,
} from "./validation"

describe("profile validation", () => {
  it("normalizes handles and rejects ambiguous ones", () => {
    expect(validateHandle(" Rija.Music ")).toBe("rija.music")
    expect(() => validateHandle("ab")).toThrow("3 à 30 caractères")
    expect(() => validateHandle("rija musique")).toThrow("3 à 30 caractères")
  })

  it("restricts social links to their expected HTTPS service", () => {
    expect(validateSocialUrl("youtubeUrl", "https://youtu.be/example")).toBe(
      "https://youtu.be/example"
    )
    expect(() =>
      validateSocialUrl("youtubeUrl", "https://malicious.example/video")
    ).toThrow("service attendu")
    expect(() =>
      validateSocialUrl("instagramUrl", "http://instagram.com/example")
    ).toThrow("service attendu")
  })

  it("bounds custom links and requires HTTPS", () => {
    expect(
      validateCustomLinks([{ label: " Site ", url: "https://example.com" }])
    ).toEqual([{ label: "Site", url: "https://example.com/" }])
    expect(() =>
      validateCustomLinks([{ label: "Site", url: "http://example.com" }])
    ).toThrow("HTTPS")
  })

  it("accepts only bounded JPEG, PNG or WebP profile images", () => {
    expect(
      validateProfileImageMetadata("avatar", {
        contentType: "image/png",
        size: 5 * 1024 * 1024,
      })
    ).toBeNull()
    expect(
      validateProfileImageMetadata("avatar", {
        contentType: "image/svg+xml",
        size: 100,
      })
    ).toContain("JPEG, PNG ou WebP")
    expect(
      validateProfileImageMetadata("banner", {
        contentType: "image/webp",
        size: 10 * 1024 * 1024 + 1,
      })
    ).toContain("10 Mo maximum")
  })
})
