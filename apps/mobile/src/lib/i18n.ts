import {
  DEFAULT_LOCALE,
  formatMessage,
  isSupportedLocale,
  type MessageKey,
} from "@lyrx/shared"

const deviceLanguage = Intl.DateTimeFormat()
  .resolvedOptions()
  .locale.slice(0, 2)
export const locale = isSupportedLocale(deviceLanguage)
  ? deviceLanguage
  : DEFAULT_LOCALE

export function t(key: MessageKey, values?: Record<string, string | number>) {
  return formatMessage(locale, key, values)
}
