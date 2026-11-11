export type LyricLine = {
  index: number
  start: number
  end: number
  text: string
}

/** Lines of the raw lyrics with their UTF-16 offsets, the unit the notebook API expects. */
export function lyricLines(source: string): Array<LyricLine> {
  const lines: Array<LyricLine> = []
  let start = 0
  for (const match of source.matchAll(/\r?\n/g)) {
    lines.push({
      index: lines.length,
      start,
      end: match.index,
      text: source.slice(start, match.index),
    })
    start = match.index + match[0].length
  }
  lines.push({
    index: lines.length,
    start,
    end: source.length,
    text: source.slice(start),
  })
  return lines
}

export type LineSelection = {
  start: number
  end: number
  text: string
  /** First and last selected line, blank edges excluded. */
  first: number
  last: number
  tooLong: boolean
}

/**
 * Range covering the lines between two taps (either order). Blank lines at the edges
 * are dropped so the saved passage never starts or ends with whitespace.
 */
export function selectLines(
  lines: ReadonlyArray<LyricLine>,
  from: number,
  to: number,
  maxLength: number
): LineSelection | null {
  let first = Math.max(0, Math.min(from, to))
  let last = Math.min(lines.length - 1, Math.max(from, to))
  while (first <= last && lines[first]!.text.trim() === "") first++
  while (last >= first && lines[last]!.text.trim() === "") last--
  if (first > last) return null
  const start = lines[first]!.start
  const end = lines[last]!.end
  return {
    start,
    end,
    text: lines
      .slice(first, last + 1)
      .map((line) => line.text)
      .join("\n"),
    first,
    last,
    tooLong: end - start > maxLength,
  }
}
