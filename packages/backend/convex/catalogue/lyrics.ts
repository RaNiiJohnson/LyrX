import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { bad } from "./values"

const MAX_SECTIONS = 40

const MAX_LINES_PER_SECTION = 100

export async function readLyrics(
  ctx: QueryCtx | MutationCtx,
  songId: Id<"songs">
) {
  const sections = await ctx.db
    .query("songSections")
    .withIndex("by_song_id_and_position", (q) => q.eq("songId", songId))
    .take(MAX_SECTIONS + 1)
  if (sections.length > MAX_SECTIONS)
    bad("CATALOGUE_INVARIANT", "Too many stored lyric sections.")
  return Promise.all(
    sections.map(async (section: Doc<"songSections">) => {
      const lines = await ctx.db
        .query("lyricLines")
        .withIndex("by_section_id_and_position", (q) =>
          q.eq("sectionId", section._id)
        )
        .take(MAX_LINES_PER_SECTION + 1)
      if (lines.length > MAX_LINES_PER_SECTION)
        bad("CATALOGUE_INVARIANT", "Too many stored lyric lines.")
      return { section, lines }
    })
  )
}

// Historical lyric content is not a diagnostic message. Keep its headings intact.
const LEGACY_SECTION_HEADINGS: Record<Doc<"songSections">["kind"], string> = {
  intro: "Intro",
  verse: "Couplet",
  chorus: "Refrain",
  bridge: "Pont",
  outro: "Outro",
  custom: "Section",
}

export async function legacyLyricsText(
  ctx: QueryCtx | MutationCtx,
  songId: Id<"songs">
) {
  const sections = await readLyrics(ctx, songId)
  return sections
    .map(({ section, lines }) => {
      const heading =
        section.kind === "custom"
          ? section.customLabel || LEGACY_SECTION_HEADINGS.custom
          : LEGACY_SECTION_HEADINGS[section.kind]
      return [`[${heading}]`, ...lines.map((line) => line.text)].join("\n")
    })
    .join("\n\n")
}

export async function lyricsTextForSong(
  ctx: QueryCtx | MutationCtx,
  song: Doc<"songs">
) {
  return song.lyricsText ?? (await legacyLyricsText(ctx, song._id))
}
