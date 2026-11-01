import { Text, View } from "react-native"
import { fonts, radius, useTheme } from "@/lib/theme"

/** The web header logo: coral rounded "X" tile followed by the wordmark. */
export function Brand() {
  const theme = useTheme()
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="Lyr'X"
      style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.brand,
        }}
      >
        <Text
          style={{
            color: theme.brandForeground,
            fontFamily: fonts.sansBold,
            fontSize: 15,
          }}
        >
          X
        </Text>
      </View>
      <Text
        style={{
          color: theme.foreground,
          fontFamily: fonts.sansSemibold,
          fontSize: 18,
          letterSpacing: -0.4,
        }}
      >
        Lyr'X
      </Text>
    </View>
  )
}
