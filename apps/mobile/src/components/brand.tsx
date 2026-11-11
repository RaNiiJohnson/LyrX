import { Text, View } from "react-native"
import Svg, { Path, Rect } from "react-native-svg"
import { PRODUCT_NAME } from "@lyrx/shared"
import { FEATHER_PATH, featherTransform } from "@/lib/brand"
import { fonts, useTheme } from "@/lib/theme"

/** The feather alone. Decorative. */
export function FeatherGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <Path
        fill={color}
        fillRule="evenodd"
        d={FEATHER_PATH}
        transform={featherTransform(1.06)}
      />
    </Svg>
  )
}

/** App icon: the ink feather on the coral rounded square. Decorative. */
export function LogoMark({ size = 32 }: { size?: number }) {
  const theme = useTheme()
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <Rect width={64} height={64} rx={16} fill={theme.brand} />
      <Path
        fill={theme.brandForeground}
        fillRule="evenodd"
        d={FEATHER_PATH}
        transform={featherTransform(0.86)}
      />
    </Svg>
  )
}

/** "Lyr'X" with the coral feather standing in for the apostrophe, in the serif face like the web header. */
export function Wordmark({ size = 24 }: { size?: number }) {
  const theme = useTheme()
  const text = {
    color: theme.foreground,
    fontFamily: fonts.serifMedium,
    fontSize: size,
    lineHeight: size * 1.15,
  }
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={PRODUCT_NAME}
      style={{ flexDirection: "row", alignItems: "flex-start" }}
    >
      <Text style={text}>Lyr</Text>
      <View style={{ marginTop: size * 0.04, marginLeft: -size * 0.04 }}>
        <FeatherGlyph size={size * 0.5} color={theme.brand} />
      </View>
      <Text style={text}>X</Text>
    </View>
  )
}

/** Header brand: the logo tile followed by the wordmark. */
export function Brand() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <LogoMark size={30} />
      <Wordmark size={22} />
    </View>
  )
}
