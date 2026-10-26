import { describe, expect, it } from "vitest"
import { lyricHeadingInsertion } from "./lyric-heading"

describe("optional lyric heading insertion", () => {
  it("starts an empty source with a standalone heading and a writing caret", () => {
    expect(lyricHeadingInsertion("", 0, 0, "Refrain")).toEqual({
      start: 0,
      end: 0,
      inserted: "[Refrain]\n",
      caret: 10,
      text: "[Refrain]\n",
    })
  })

  it("adds a heading at the end without changing the previous lyrics", () => {
    const source = "A first line\nA second line"
    const edit = lyricHeadingInsertion(
      source,
      source.length,
      source.length,
      "Pont"
    )
    expect(edit.text).toBe(`${source}\n[Pont]\n`)
    expect(edit.caret).toBe(edit.text.length)
  })

  it("replaces only the selected text and creates separate heading lines", () => {
    const edit = lyricHeadingInsertion(
      "before selected after",
      7,
      15,
      "Couplet"
    )
    expect(edit.text).toBe("before \n[Couplet]\n\n after")
    expect(edit.text.slice(0, edit.start)).toBe("before ")
    expect(edit.text.slice(edit.caret)).toBe("\n after")
  })

  it("inserts in the middle and leaves the caret before the following lyrics", () => {
    const edit = lyricHeadingInsertion("first\nlast", 6, 6, "Refrain")
    expect(edit.text).toBe("first\n[Refrain]\n\nlast")
    expect(edit.text.slice(edit.caret)).toBe("\nlast")
  })

  it("does not duplicate a separating newline already present after the selection", () => {
    expect(lyricHeadingInsertion("first\n\nlast", 6, 6, "Pont").text).toBe(
      "first\n[Pont]\n\nlast"
    )
  })

  it("preserves all original CRLF and blank lines outside the insertion", () => {
    const source = "first\r\n\r\nlast\r\n"
    const edit = lyricHeadingInsertion(source, 7, 7, "Bridge")
    expect(edit.text).toBe("first\r\n[Bridge]\n\n\r\nlast\r\n")
    expect(edit.text.slice(edit.caret + 1)).toBe(source.slice(7))
  })

  it("clamps selection bounds and never removes outside the source", () => {
    expect(lyricHeadingInsertion("keep", -12, 100, "Pont")).toMatchObject({
      start: 0,
      end: 4,
      text: "[Pont]\n",
    })
    expect(lyricHeadingInsertion("keep", 100, -5, "Pont")).toMatchObject({
      start: 4,
      end: 4,
      text: "keep\n[Pont]\n",
    })
  })
})
