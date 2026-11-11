import { useState, type ComponentProps } from "react"
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { t } from "@/lib/i18n"
import { fonts, radius, space, useTheme } from "@/lib/theme"

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: "primary" | "outline"
}) {
  const theme = useTheme()
  const primary = variant === "primary"
  const inactive = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={{
        minHeight: 48,
        paddingHorizontal: space.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: space.sm,
        borderRadius: radius.pill,
        borderWidth: primary ? 0 : 1,
        borderColor: theme.border,
        backgroundColor: primary ? theme.primary : "transparent",
        opacity: inactive ? 0.55 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator
          color={primary ? theme.primaryForeground : theme.foreground}
        />
      ) : null}
      <Text
        style={{
          color: primary ? theme.primaryForeground : theme.foreground,
          fontFamily: fonts.sansSemibold,
          fontSize: 16,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/** Text-only action for secondary navigation between auth modes. */
export function LinkButton({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      hitSlop={8}
      style={{ alignSelf: "flex-start" }}
    >
      <Text
        style={{
          color: theme.foreground,
          fontFamily: fonts.sansMedium,
          fontSize: 14,
          textDecorationLine: "underline",
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function TextField({
  label,
  error,
  hint,
  secure,
  ...input
}: {
  label: string
  error?: string | null
  /** Helper text under the field, hidden while an error is shown. */
  hint?: string
  secure?: boolean
} & Omit<ComponentProps<typeof TextInput>, "secureTextEntry" | "style">) {
  const theme = useTheme()
  const [revealed, setRevealed] = useState(false)
  return (
    <View style={{ gap: space.xs }}>
      <Text
        style={{
          color: theme.foreground,
          fontFamily: fonts.sansMedium,
          fontSize: 14,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? theme.destructive : theme.border,
          backgroundColor: theme.card,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.mutedForeground}
          secureTextEntry={secure && !revealed}
          autoCapitalize="none"
          autoCorrect={false}
          {...input}
          style={{
            flex: 1,
            minHeight: input.multiline ? 112 : 48,
            paddingHorizontal: space.md,
            paddingVertical: input.multiline ? space.sm : 0,
            textAlignVertical: input.multiline ? "top" : "center",
            color: theme.foreground,
            fontFamily: fonts.sans,
            fontSize: 16,
          }}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              revealed ? t("auth.hidePassword") : t("auth.showPassword")
            }
            onPress={() => setRevealed((value) => !value)}
            hitSlop={8}
            style={{ paddingHorizontal: space.md }}
          >
            <Ionicons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={theme.mutedForeground}
            />
          </Pressable>
        ) : null}
      </View>
      {hint && !error ? (
        <Text
          style={{
            color: theme.mutedForeground,
            fontFamily: fonts.sans,
            fontSize: 13,
          }}
        >
          {hint}
        </Text>
      ) : null}
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{
            color: theme.destructive,
            fontFamily: fonts.sans,
            fontSize: 13,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
}
