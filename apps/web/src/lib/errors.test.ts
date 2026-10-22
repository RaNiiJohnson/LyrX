import { describe, expect, it } from "vitest"

import type { MessageKey } from "@lyrx/shared"

import { getErrorMessage, localizedUiError } from "./errors"

const translate = (key: MessageKey) => `translated:${key}`

describe("localized error messages", () => {
  it("translates stable provider and Convex error codes", () => {
    expect(
      getErrorMessage(
        { data: { code: "HANDLE_TAKEN" }, message: "French server detail" },
        translate
      )
    ).toBe("translated:error.handleTaken")
  })

  it.each([
    ["INVALID_INPUT", "error.invalidCatalogue"],
    ["INVALID_IMAGE", "error.invalidImage"],
    ["INVALID_LYRICS", "error.invalidLyrics"],
    ["INVALID_TRACKS", "error.invalidTracks"],
    ["NOT_FOUND", "error.catalogueNotFound"],
    ["CATALOGUE_INVARIANT", "error.catalogueUnavailable"],
    ["SONG_ALREADY_IN_ALBUM", "error.songAlreadyInAlbum"],
  ] as const)("translates catalogue code %s", (code, key) => {
    expect(getErrorMessage({ data: { code } }, translate)).toBe(
      `translated:${key}`
    )
  })

  it("does not leak an unknown provider language into the interface", () => {
    expect(
      getErrorMessage(new Error("Untranslated provider detail"), translate)
    ).toBe("translated:error.unexpected")
  })

  it("preserves explicitly localized client errors", () => {
    expect(
      getErrorMessage(localizedUiError("Localized upload failure"), translate)
    ).toBe("Localized upload failure")
  })

  it("handles cyclic provider errors safely", () => {
    const error: { cause?: unknown; message: string } = { message: "Unknown" }
    error.cause = error

    expect(getErrorMessage(error, translate)).toBe(
      "translated:error.unexpected"
    )
  })
})
