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

export function useTheme() {
  return THEME_TOKENS[useScheme()]
}

/** Hex colour with an alpha channel, for the translucent overlays the web builds with `/15`-style utilities. */
export function withAlpha(hex: string, alpha: number) {
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`
}

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const
