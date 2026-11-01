import { describe, expect, it } from "vitest"
import { notebookSourceRange } from "./notebook"

describe("notebook native selection offsets", () => {
  it("maps CRLF, lone CR, repeated text and Unicode without changing stored source", () => {
    const source = "echo\r\nécho\r😀\necho"
    const display = source.replace(/\r\n?/g, "\n")
    const start = display.lastIndexOf("echo")
    const range = notebookSourceRange(source, start, start + 4)
    expect(source.slice(range.start, range.end)).toBe("echo")
    expect(range.start).toBe(source.lastIndexOf("echo"))
    expect(notebookSourceRange(source, 0, display.length)).toEqual({
      start: 0,
      end: source.length,
    })
    const emoji = display.indexOf("😀")
    const emojiRange = notebookSourceRange(source, emoji, emoji + 2)
    expect(source.slice(emojiRange.start, emojiRange.end)).toBe("😀")
  })
})
