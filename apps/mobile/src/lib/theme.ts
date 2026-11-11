import { useColorScheme } from "react-native"
import { THEME_TOKENS, type ThemeMode } from "@lyrx/shared"
import { usePreferences } from "@/lib/preferences-store"

export { fonts } from "@/lib/fonts"

/** The shown scheme: the explicit light/dark choice, else the device's. */
export function useScheme(): ThemeMode {
  const device = useColorScheme()
  const { theme } = usePreferences()
  if (theme !== "system") return theme
  return device === "dark" ? "dark" : "light"
}

/**
 * Web tokens plus `outline`: a control/card border that stays visible on a phone screen.
 * The shared `border` is a near-invisible hairline in dark mode, fine for list separators only.
 */
const THEMES = {
  light: { ...THEME_TOKENS.light, outline: "#c4c4c4" },
  dark: { ...THEME_TOKENS.dark, outline: "#3b3b3b" },
} as const

export function useTheme() {
  return THEMES[useScheme()]
}

/** Hex colour with an alpha channel, for the translucent overlays the web builds with `/15`-style utilities. */
export function withAlpha(hex: string, alpha: number) {
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`
}

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const
