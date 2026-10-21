export const PRODUCT_ID = "lyrx" as const
export const PRODUCT_NAME = "Lyr'X" as const

export const DEFAULT_LOCALE = "fr" as const
export const SUPPORTED_LOCALES = Object.freeze(["fr", "en"] as const)

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export { formatMessage, isSupportedLocale, UI_MESSAGES } from "./i18n"
export type { MessageKey } from "./i18n"
export { isValidDisplayName, isValidHandle } from "./profile"
