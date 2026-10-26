/** Insert a standalone heading, leaving all text outside the selection intact. */
export function lyricHeadingInsertion(
  text: string,
  start: number,
  end: number,
  heading: string
) {
  const from = Math.max(0, Math.min(start, text.length))
  const to = Math.max(from, Math.min(end, text.length))
  const before = text.slice(0, from)
  const after = text.slice(to)
  const prefix = before && !before.endsWith("\n") ? "\n" : ""
  const line = `${prefix}[${heading}]\n`
  const inserted = line + (after && !after.startsWith("\n") ? "\n" : "")
  return {
    start: from,
    end: to,
    inserted,
    caret: from + line.length,
    text: before + inserted + after,
  }
}
