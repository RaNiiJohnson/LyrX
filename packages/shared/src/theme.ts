/**
 * Framework-neutral colour tokens for clients without CSS variables (Expo).
 * The web source of truth is `packages/ui/src/styles/globals.css`; `theme.test.ts`
 * fails if these values drift from it.
 */
export const THEME_TOKENS = {
  light: {
    background: "#f9f9f9",
    foreground: "#202020",
    brand: "#df4f55",
    brandForeground: "#161218",
    heroForeground: "#fcf8f3",
    heroMutedForeground: "#e9e4dc",
    card: "#fcfcfc",
    cardForeground: "#202020",
    primary: "#644a40",
    primaryForeground: "#ffffff",
    secondary: "#ffdfb5",
    secondaryForeground: "#582d1d",
    muted: "#efefef",
    mutedForeground: "#646464",
    accent: "#e8e8e8",
    border: "#d8d8d8",
    destructive: "#e54d2e",
  },
  dark: {
    background: "#111111",
    foreground: "#eeeeee",
    brand: "#df4f55",
    brandForeground: "#161218",
    heroForeground: "#fcf8f3",
    heroMutedForeground: "#e9e4dc",
    card: "#191919",
    cardForeground: "#eeeeee",
    primary: "#ffe0c2",
    primaryForeground: "#081a1b",
    secondary: "#393028",
    secondaryForeground: "#ffe0c2",
    muted: "#222222",
    mutedForeground: "#b4b4b4",
    accent: "#2a2a2a",
    border: "#201e18",
    destructive: "#e54d2e",
  },
} as const

export type ThemeMode = keyof typeof THEME_TOKENS
export type ThemeTokens = (typeof THEME_TOKENS)[ThemeMode]
