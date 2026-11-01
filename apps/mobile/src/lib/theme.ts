import { useColorScheme } from "react-native"
import { THEME_TOKENS } from "@lyrx/shared"

export { fonts } from "@/lib/fonts"

export function useTheme() {
  return THEME_TOKENS[useColorScheme() === "dark" ? "dark" : "light"]
}

/** Hex colour with an alpha channel, for the translucent overlays the web builds with `/15`-style utilities. */
export function withAlpha(hex: string, alpha: number) {
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`
}

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const
