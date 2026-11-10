import * as Haptics from "expo-haptics"

/** Light confirmation tick for toggles and selections. Haptics are optional, so failures are ignored. */
export function tick() {
  Haptics.selectionAsync().catch(() => undefined)
}

/** Stronger tick for a completed action (a like, a saved passage). */
export function success() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => undefined
  )
}
