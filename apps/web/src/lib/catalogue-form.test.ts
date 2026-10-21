import { describe, expect, it } from "vitest"

import {
  emptySongValues,
  namesFromTextarea,
  toSongMutationInput,
} from "./catalogue-form"

describe("catalogue form mapping", () => {
  it("normalizes multiline credits", () => {
    expect(namesFromTextarea(" Alice \n\nBob\n Alice ")).toEqual([
      "Alice",
      "Bob",
      "Alice",
    ])
  })

  it("preserves stable section and line ids on edits", () => {
    const values = emptySongValues("Lyr’X")
    values.sections[0] = {
      id: "section-id" as never,
      kind: "verse",
      customLabel: "ignored",
      lines: [{ id: "line-id" as never, text: "Une ligne" }],
    }

    expect(toSongMutationInput(values).sections).toEqual([
      {
        id: "section-id",
        kind: "verse",
        customLabel: undefined,
        lines: [{ id: "line-id", text: "Une ligne" }],
      },
    ])
  })
})
