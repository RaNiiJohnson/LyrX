import { View } from "react-native"
import { Segmented } from "@/components/kit"
import { Heading } from "@/components/ui"
import { t } from "@/lib/i18n"
import {
  THEME_PREFERENCES,
  type LanguagePreference,
  type ThemePreference,
} from "@/lib/preferences"
import { setPreferences, usePreferences } from "@/lib/preferences-store"
import { space } from "@/lib/theme"

const LANGUAGES: ReadonlyArray<LanguagePreference> = ["system", "fr", "en"]

/** Language and theme choices, shown to everyone (signed in or not), saved on the device. */
export function PreferencesPanel() {
  const preferences = usePreferences()
  return (
    <View style={{ gap: space.md }}>
      <Heading>{t("preferences.language")}</Heading>
      <Segmented<LanguagePreference>
        label={t("preferences.language")}
        value={preferences.language}
        onChange={(language) => setPreferences({ language })}
        options={LANGUAGES.map((value) => ({
          value,
          label:
            value === "system"
              ? t("theme.system")
              : value === "fr"
                ? t("locale.french")
                : t("locale.english"),
        }))}
      />
      <Heading>{t("preferences.theme")}</Heading>
      <Segmented<ThemePreference>
        label={t("preferences.theme")}
        value={preferences.theme}
        onChange={(theme) => setPreferences({ theme })}
        options={THEME_PREFERENCES.map((value) => ({
          value,
          label: t(`theme.${value}`),
        }))}
      />
    </View>
  )
}
