/** Genre aliases are public vocabulary, never private moderation metadata. */
export function genreSearchText(genre?: string, other?: string) {
  const aliases: Record<string, string> = {
    electronic: "electronic électronique",
    rnb: "R&B RnB",
    "hip-hop": "hip hop hip-hop",
    other: "other autre",
  }
  return [genre, genre ? aliases[genre] : undefined, other]
    .filter(Boolean)
    .join(" ")
}

export function searchTerms(text: string) {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
}

/** Best-effort literal token excerpt; this does not implement another search engine. */
export function matchingExcerpt(lyrics: string, query: string): string | null {
  const terms = searchTerms(query)
  const tokens = lyrics.matchAll(/[\p{L}\p{N}]+/gu)
  for (const token of tokens) {
    const word = token[0].toLowerCase()
    if (
      !terms.some((term, i) =>
        i === terms.length - 1 ? word.startsWith(term) : word === term
      )
    )
      continue
    const start = Math.max(0, token.index - 65)
    const end = Math.min(lyrics.length, start + 220)
    return `${start ? "…" : ""}${lyrics.slice(start, end).trim()}${end < lyrics.length ? "…" : ""}`
  }
  return null
}
