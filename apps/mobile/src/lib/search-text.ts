/** Delay before typing turns into a query, matching the web search box. */
export const SEARCH_DEBOUNCE_MS = 500

/** Mirrors the server bounds so an invalid request shows guidance instead of an error screen. */
export function validSearch(text: string) {
  const terms = text.split(/\s+/).filter(Boolean)
  return (
    text.length > 0 &&
    text.length <= 200 &&
    terms.length > 0 &&
    terms.length <= 16 &&
    terms.every((term) => term.length <= 32)
  )
}
