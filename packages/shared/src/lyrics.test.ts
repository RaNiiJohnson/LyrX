import { describe, expect, it } from "vitest"

import { parseLyrics } from "./lyrics"

describe("parseLyrics", () => {
  it("preserves CRLF source text exactly while deriving lines", () => {
    const rawText = "[Couplet 1]\r\nUne ligne\r\n\r\nUne autre\r\n"
    const parsed = parseLyrics(rawText)

    expect(parsed.rawText).toBe(rawText)
    expect(parsed.sections[0]).toEqual({
      heading: "Couplet 1",
      kind: "verse",
      lines: ["Une ligne", "", "Une autre", ""],
    })
  })

  it.each([
    ["Couplet 2", "verse"],
    ["Verse III", "verse"],
    ["Refrain", "chorus"],
    ["Chorus 2", "chorus"],
    ["Pont", "bridge"],
    ["Bridge", "bridge"],
    ["Intro", "intro"],
    ["Outro", "outro"],
  ] as const)("recognizes [%s] as %s", (heading, kind) => {
    expect(parseLyrics(`[${heading}]\nTexte`).sections[0]?.kind).toBe(kind)
  })

  it("keeps unknown headings as custom sections without guessing", () => {
    expect(parseLyrics("[Après la pluie]\nTexte").sections[0]).toEqual({
      heading: "Après la pluie",
      kind: "custom",
      lines: ["Texte"],
    })
  })

  it("keeps unheaded text in an unlabelled custom section", () => {
    expect(parseLyrics("Première\nDeuxième").sections).toEqual([
      {
        heading: null,
        kind: "custom",
        lines: ["Première", "Deuxième"],
      },
    ])
  })

  it("preserves blank lines as visual separators", () => {
    expect(parseLyrics("Une\n\n\nDeux").sections[0]?.lines).toEqual([
      "Une",
      "",
      "",
      "Deux",
    ])
  })

  it("preserves empty sections created by consecutive headings", () => {
    expect(parseLyrics("[Intro]\n[Refrain]\nBonjour").sections).toEqual([
      { heading: "Intro", kind: "intro", lines: [] },
      { heading: "Refrain", kind: "chorus", lines: ["Bonjour"] },
    ])
  })
})
