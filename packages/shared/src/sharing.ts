export const SHARE_CARD_WIDTH = 1080
export const SHARE_CARD_HEIGHT = 1920
export const MAX_SHARE_TEXT_LENGTH = 360
export const MAX_SHARE_LINES = 10

/** Canonical UTF-16 range, without splitting Unicode surrogate pairs. */
export function validShareRange(text: string, start: number, end: number) {
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end > text.length ||
    start >= end ||
    end - start > MAX_SHARE_TEXT_LENGTH
  )
    return false
  for (const position of [start, end]) {
    const code = text.charCodeAt(position)
    if (code >= 0xdc00 && code <= 0xdfff) return false
  }
  return text.slice(start, end).trim().length > 0
}
