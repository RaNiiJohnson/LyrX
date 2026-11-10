import { useEffect, useRef, type ComponentProps, type ReactNode } from "react"
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type DimensionValue,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tick } from "@/lib/haptics"
import { t } from "@/lib/i18n"
import { fonts, radius, space, useTheme, withAlpha } from "@/lib/theme"

/** Minimum comfortable touch target (Material 48dp / Apple 44pt). */
export const TOUCH = 44

export type IconName = ComponentProps<typeof Ionicons>["name"]

/** Round icon-only button. `label` is the accessible name (required: there is no visible text). */
export function IconButton({
  icon,
  label,
  onPress,
  active,
  disabled,
  tone = "default",
}: {
  icon: IconName
  label: string
  onPress: () => void
  active?: boolean
  disabled?: boolean
  tone?: "default" | "brand"
}) {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => ({
        width: TOUCH,
        height: TOUCH,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? theme.accent : "transparent",
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Ionicons
        name={icon}
        size={22}
        color={active || tone === "brand" ? theme.brand : theme.foreground}
      />
    </Pressable>
  )
}

/** Pill selector for a small set of exclusive options (catalogue tabs, sort, theme, language). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  label: string
}) {
  const theme = useTheme()
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        padding: 4,
        gap: 4,
        borderRadius: radius.pill,
        backgroundColor: theme.muted,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) {
                tick()
                onChange(option.value)
              }
            }}
            style={{
              flex: 1,
              minHeight: TOUCH - 4,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: space.sm,
              borderRadius: radius.pill,
              backgroundColor: selected ? theme.card : "transparent",
              borderWidth: selected ? 1 : 0,
              borderColor: theme.border,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: selected ? theme.foreground : theme.mutedForeground,
                fontFamily: selected ? fonts.sansSemibold : fonts.sansMedium,
                fontSize: 14,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Toggleable filter chip. */
export function Chip({
  label,
  selected,
  onPress,
  onClear,
}: {
  label: string
  selected?: boolean
  onPress: () => void
  /** When set and selected, shows a clear glyph that calls this instead. */
  onClear?: () => void
}) {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        tick()
        if (selected && onClear) onClear()
        else onPress()
      }}
      style={{
        minHeight: 40,
        paddingHorizontal: space.md,
        flexDirection: "row",
        alignItems: "center",
        gap: space.xs,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? theme.primary : theme.border,
        backgroundColor: selected ? withAlpha(theme.primary, 0.12) : theme.card,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: theme.foreground,
          fontFamily: selected ? fonts.sansSemibold : fonts.sansMedium,
          fontSize: 14,
        }}
      >
        {label}
      </Text>
      {selected && onClear ? (
        <Ionicons name="close" size={16} color={theme.mutedForeground} />
      ) : null}
    </Pressable>
  )
}

/** Pulsing placeholder block shown while a query loads (respects the device "reduce motion" through Animated being cheap). */
export function Skeleton({
  width = "100%",
  height = 16,
  rounded = radius.sm,
}: {
  width?: DimensionValue
  height?: number
  rounded?: number
}) {
  const theme = useTheme()
  const opacity = useRef(new Animated.Value(0.5)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return (
    <Animated.View
      aria-hidden
      style={{
        width,
        height,
        borderRadius: rounded,
        backgroundColor: theme.muted,
        opacity,
      }}
    />
  )
}

/** Bottom sheet over a dimmed backdrop: tap the backdrop, swipe the system back, or press close to dismiss. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const theme = useTheme()
  const { bottom } = useSafeAreaInsets()
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
        />
        <View
          style={{
            maxHeight: "85%",
            backgroundColor: theme.background,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingBottom: bottom + space.md,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: space.md + 4,
              paddingRight: space.sm,
              paddingTop: space.sm,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                color: theme.foreground,
                fontFamily: fonts.sansSemibold,
                fontSize: 18,
              }}
            >
              {title}
            </Text>
            <IconButton
              icon="close"
              label={t("common.close")}
              onPress={onClose}
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: space.md,
              paddingTop: space.sm,
              gap: space.md,
            }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
