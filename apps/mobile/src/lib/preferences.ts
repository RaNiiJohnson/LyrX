import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from "@lyrx/shared"

export const THEME_PREFERENCES = ["system", "light", "dark"] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type LanguagePreference = "system" | SupportedLocale

export type Preferences = {
  theme: ThemePreference
  language: LanguagePreference
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  language: "system",
}

export const PREFERENCES_STORAGE_KEY = "lyrx.preferences"

function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.some((theme) => theme === value)
}

/** Reads what was stored, ignoring anything corrupt or unknown (older builds, manual edits). */
export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return DEFAULT_PREFERENCES
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== "object" || value === null) return DEFAULT_PREFERENCES
    const stored = value as Record<string, unknown>
    return {
      theme: isThemePreference(stored.theme)
        ? stored.theme
        : DEFAULT_PREFERENCES.theme,
      language:
        stored.language === "system" || isSupportedLocale(stored.language)
          ? stored.language
          : DEFAULT_PREFERENCES.language,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

/** The shown language: the explicit choice, else the device language when supported, else the default. */
export function resolveLocale(
  language: LanguagePreference,
  deviceLanguage: string
): SupportedLocale {
  if (language !== "system") return language
  const device = deviceLanguage.slice(0, 2).toLowerCase()
  return isSupportedLocale(device) ? device : DEFAULT_LOCALE
}
