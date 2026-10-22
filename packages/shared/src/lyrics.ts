export const MAX_LYRICS_TEXT_LENGTH = 100_000

export const LYRIC_SECTION_KINDS = [
  "intro",
  "verse",
  "chorus",
  "bridge",
  "outro",
  "custom",
] as const

export type LyricSectionKind = (typeof LYRIC_SECTION_KINDS)[number]

export type ParsedLyricSection = {
  heading: string | null
  kind: LyricSectionKind
  lines: Array<string>
}

export type ParsedLyrics = {
  rawText: string
  sections: Array<ParsedLyricSection>
}

const HEADING_PATTERN = /^\s*\[([^\]\r\n]+)\]\s*$/

function normalizeHeading(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function kindFromHeading(heading: string): LyricSectionKind {
  const normalized = normalizeHeading(heading)
  const base = normalized.replace(/\s+[0-9ivxlcdm]+$/i, "")

  if (base === "intro" || base === "introduction") return "intro"
  if (base === "couplet" || base === "verse") return "verse"
  if (base === "refrain" || base === "chorus") return "chorus"
  if (base === "pont" || base === "bridge") return "bridge"
  if (base === "outro" || base === "conclusion") return "outro"
  return "custom"
}

/**
 * Derive renderable sections without ever normalizing the canonical source.
 * Lines containing only `[Heading]` open a new section. Unknown headings stay
 * custom, blank lines stay blank, and consecutive headings keep empty sections.
 */
export function parseLyrics(rawText: string): ParsedLyrics {
  const lines = rawText.split(/\r\n|\n|\r/)
  const sections: Array<ParsedLyricSection> = []
  let current: ParsedLyricSection | null = null

  for (const line of lines) {
    const match = line.match(HEADING_PATTERN)
    if (match) {
      const heading = match[1] ?? ""
      current = {
        heading,
        kind: kindFromHeading(heading),
        lines: [],
      }
      sections.push(current)
      continue
    }

    if (!current) {
      current = { heading: null, kind: "custom", lines: [] }
      sections.push(current)
    }
    current.lines.push(line)
  }

  return { rawText, sections }
}
