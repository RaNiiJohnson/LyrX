import { describe, expect, it } from "vitest"
import {
  EMPTY_PROFILE,
  artistInput,
  profileErrors,
  profileInput,
  valuesFromCurrent,
} from "./profile-form"

const valid = { ...EMPTY_PROFILE, displayName: "Rija Rasolo", handle: "rija.r" }

describe("profile form", () => {
  it("flags an invalid name and handle", () => {
    expect(profileErrors(valid)).toEqual({})
    expect(profileErrors({ ...valid, displayName: " " }).displayName).toBe(
      "error.invalidDisplayName"
    )
    expect(profileErrors({ ...valid, handle: "a b" }).handle).toBe(
      "error.invalidHandle"
    )
  })

  it("omits empty optional fields and trims the rest", () => {
    const input = artistInput({
      ...valid,
      presentation: "  ",
      instagramUrl: " https://instagram.com/x ",
      customLinks: [
        { label: " Site ", url: " https://a.example " },
        { label: "", url: "" },
      ],
    })
    expect(input.presentation).toBeUndefined()
    expect(input.instagramUrl).toBe("https://instagram.com/x")
    expect(input.customLinks).toEqual([
      { label: "Site", url: "https://a.example" },
    ])
  })

  it("only sends the artist block for artists", () => {
    expect(profileInput(valid, "fan").artist).toBeUndefined()
    expect(profileInput(valid, "artist").artist?.customLinks).toEqual([])
    expect(profileInput({ ...valid, bio: "" }, "fan").bio).toBeUndefined()
  })

  it("rebuilds editable values from the current profile", () => {
    const values = valuesFromCurrent(
      { handle: "h", displayName: "N" },
      { customLinks: [{ label: "L", url: "https://u.example" }] }
    )
    expect(values.bio).toBe("")
    expect(values.customLinks).toEqual([
      { label: "L", url: "https://u.example" },
    ])
  })
})
