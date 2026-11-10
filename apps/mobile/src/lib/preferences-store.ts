import { useSyncExternalStore } from "react"
import { Appearance } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  parsePreferences,
  type Preferences,
} from "@/lib/preferences"

let current: Preferences = DEFAULT_PREFERENCES
const listeners = new Set<() => void>()

function apply(next: Preferences) {
  current = next
  // Native chrome (keyboard, dialogs, status bar) follows the override. react-native-web
  // (the Expo web export used for visual checks) has no such API; `useScheme` still applies it.
  if (typeof Appearance.setColorScheme === "function")
    Appearance.setColorScheme(
      next.theme === "system" ? "unspecified" : next.theme
    )
  listeners.forEach((listener) => listener())
}

export function getPreferences() {
  return current
}

/** Loads the saved choices once, before the first screen is shown. Never throws. */
export async function hydratePreferences() {
  try {
    apply(parsePreferences(await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY)))
  } catch {
    apply(DEFAULT_PREFERENCES)
  }
}

export function setPreferences(patch: Partial<Preferences>) {
  apply({ ...current, ...patch })
  // A failed save only loses the choice for the next launch.
  AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(current)).catch(
    () => undefined
  )
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usePreferences() {
  return useSyncExternalStore(subscribe, getPreferences, getPreferences)
}
