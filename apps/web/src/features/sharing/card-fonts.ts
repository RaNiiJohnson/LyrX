let loading: Promise<unknown> | undefined

/**
 * Fraunces is only needed by the share card, so its stylesheet is fetched the
 * first time a card is opened or rendered instead of on every page.
 */
export function loadCardFonts() {
  loading ??= import("@lyrx/ui/share-fonts.css").catch(() => {
    loading = undefined
  })
  return loading
}
