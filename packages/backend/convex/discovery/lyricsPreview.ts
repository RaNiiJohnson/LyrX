const MAX_LINES = 3
const MAX_LINE_LENGTH = 90

/**
 * The first lines of a public lyric for a teaser: section headings such as
 * `[Verse 1]` and blank lines are skipped, each line is shortened. Pure: callers
 * pass lyrics they already read from a published source.
 */
export function lyricsPreview(lyricsText: string | undefined) {
  if (!lyricsText) return undefined
  const lines: Array<string> = []
  for (const raw of lyricsText.split(/\r\n|\r|\n/)) {
    const line = raw.trim()
    if (!line || /^\[[^\]]*\]$/.test(line)) continue
    const chars = Array.from(line)
    lines.push(
      chars.length > MAX_LINE_LENGTH
        ? `${chars
            .slice(0, MAX_LINE_LENGTH - 1)
            .join("")
            .trimEnd()}…`
        : line
    )
    if (lines.length === MAX_LINES) break
  }
  return lines.length ? lines.join("\n") : undefined
}
