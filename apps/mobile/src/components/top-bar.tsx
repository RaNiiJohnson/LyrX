import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Brand } from "@/components/brand"
import { radius, space, useTheme, withAlpha } from "@/lib/theme"

const BAR_HEIGHT = 56

/** Height that tab screens must reserve under the floating bar. */
export function useTopBarInset() {
  return useSafeAreaInsets().top + BAR_HEIGHT + space.md
}

/** The web's floating rounded header: translucent card pill with the brand on the left. */
export function TopBar() {
  const theme = useTheme()
  const { top } = useSafeAreaInsets()
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: top + space.sm,
        left: space.md,
        right: space.md,
      }}
    >
      <View
        style={{
          height: BAR_HEIGHT,
          paddingHorizontal: space.md,
          flexDirection: "row",
          alignItems: "center",
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: withAlpha(theme.border, 0.8),
          backgroundColor: withAlpha(theme.background, 0.88),
        }}
      >
        <Brand />
      </View>
    </View>
  )
}
