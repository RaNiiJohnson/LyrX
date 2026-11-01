export const PRODUCT_ID = "lyrx" as const
export const PRODUCT_NAME = "Lyr'X" as const

export const DEFAULT_LOCALE = "fr" as const
export const SUPPORTED_LOCALES = Object.freeze(["fr", "en"] as const)

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export { formatMessage, isSupportedLocale, UI_MESSAGES } from "./i18n"
export type { MessageKey } from "./i18n"
export { isValidDisplayName, isValidHandle } from "./profile"
export {
  LYRIC_SECTION_KINDS,
  MAX_LYRICS_TEXT_LENGTH,
  parseLyrics,
} from "./lyrics"
export type {
  LyricSectionKind,
  ParsedLyricSection,
  ParsedLyrics,
} from "./lyrics"

export { notebookSourceRange } from "./notebook"
export {
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHT,
  MAX_SHARE_TEXT_LENGTH,
  MAX_SHARE_LINES,
  validShareRange,
} from "./sharing"
