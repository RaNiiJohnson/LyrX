import { formatMessage, type MessageKey } from "@lyrx/shared"
import { resolveLocale } from "@/lib/preferences"
import { getPreferences, usePreferences } from "@/lib/preferences-store"

const deviceLanguage = Intl.DateTimeFormat().resolvedOptions().locale

/** The language currently shown (explicit choice, else the device language). */
export function currentLocale() {
  return resolveLocale(getPreferences().language, deviceLanguage)
}

/** Subscribes a component to language changes; the root layout re-mounts the tree on change. */
export function useLocale() {
  return resolveLocale(usePreferences().language, deviceLanguage)
}

export function t(key: MessageKey, values?: Record<string, string | number>) {
  return formatMessage(currentLocale(), key, values)
}
