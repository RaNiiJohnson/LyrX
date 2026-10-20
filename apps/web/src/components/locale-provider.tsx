import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ReactNode } from "react"

import { DEFAULT_LOCALE, formatMessage, isSupportedLocale } from "@lyrx/shared"
import type { MessageKey, SupportedLocale } from "@lyrx/shared"

const LOCALE_STORAGE_KEY = "lyrx-locale"

type LocaleContextValue = {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
  t: (
    key: MessageKey,
    values?: Readonly<Record<string, string | number>>
  ) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE)

  useEffect(() => {
    try {
      const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)
      if (isSupportedLocale(storedLocale)) setLocaleState(storedLocale)
    } catch {
      // Storage may be unavailable in hardened browser contexts; French remains
      // the documented default and the in-memory preference still works.
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale)
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
    } catch {
      // Keep the active in-memory choice even when persistence is unavailable.
    }
  }, [])

  const t = useCallback<LocaleContextValue["t"]>(
    (key, values) => formatMessage(locale, key, values),
    [locale]
  )

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider")
  }
  return context
}
