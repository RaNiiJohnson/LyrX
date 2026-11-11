import { describe, expect, it } from "vitest"
import { lyricLines, selectLines } from "./lyric-lines"

describe("lyricLines", () => {
  it("keeps raw offsets, including CRLF and a trailing line", () => {
    const source = "ab\r\ncd\n\nef"
    const lines = lyricLines(source)
    expect(lines.map((line) => line.text)).toEqual(["ab", "cd", "", "ef"])
    for (const line of lines)
      expect(source.slice(line.start, line.end)).toBe(line.text)
  })
})

describe("selectLines", () => {
  const source = "one\ntwo\n\nthree\nfour"
  const lines = lyricLines(source)
  it("spans the tapped lines in either order", () => {
    const forward = selectLines(lines, 0, 1, 100)
    expect(forward?.text).toBe("one\ntwo")
    expect(selectLines(lines, 1, 0, 100)).toEqual(forward)
    expect(source.slice(forward!.start, forward!.end)).toBe(forward!.text)
  })
  it("drops blank edges and rejects blank-only selections", () => {
    expect(selectLines(lines, 1, 2, 100)?.text).toBe("two")
    expect(selectLines(lines, 2, 2, 100)).toBeNull()
  })
  it("flags selections above the limit", () => {
    expect(selectLines(lines, 0, 4, 5)?.tooLong).toBe(true)
    expect(selectLines(lines, 0, 0, 5)?.tooLong).toBe(false)
  })
})
