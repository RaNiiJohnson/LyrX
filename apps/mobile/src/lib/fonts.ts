import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular"
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium"
import { DMSans_600SemiBold } from "@expo-google-fonts/dm-sans/600SemiBold"
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold"
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader/400Regular"
import { Newsreader_400Regular_Italic } from "@expo-google-fonts/newsreader/400Regular_Italic"
import { Newsreader_500Medium } from "@expo-google-fonts/newsreader/500Medium"
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono/400Regular"

/** Same families as the web (DM Sans, Newsreader, Space Mono); weights are separate faces on native. */
export const fontSources = {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
  SpaceMono_400Regular,
}

export const fonts = {
  sans: "DMSans_400Regular",
  sansMedium: "DMSans_500Medium",
  sansSemibold: "DMSans_600SemiBold",
  sansBold: "DMSans_700Bold",
  serif: "Newsreader_400Regular",
  serifItalic: "Newsreader_400Regular_Italic",
  serifMedium: "Newsreader_500Medium",
  mono: "SpaceMono_400Regular",
} as const
