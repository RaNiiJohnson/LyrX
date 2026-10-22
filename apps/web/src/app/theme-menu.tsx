import { useEffect, useState } from "react"
import { Laptop, Moon, Sun } from "lucide-react"

import { Button } from "@lyrx/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@lyrx/ui/components/dropdown-menu"
import { useTheme } from "@lyrx/ui/components/theme-provider"

import { useLocale } from "./locale-provider"

const THEMES = ["light", "dark", "system"] as const
type ThemePreference = (typeof THEMES)[number]

function isThemePreference(value: string): value is ThemePreference {
  return THEMES.some((theme) => theme === value)
}

export function ThemeMenu() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const { t } = useLocale()

  useEffect(() => setMounted(true), [])

  const preference =
    mounted && theme && isThemePreference(theme) ? theme : "system"
  const label = t(`theme.${preference}`)
  const Icon =
    preference === "light" ? Sun : preference === "dark" ? Moon : Laptop

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${t("preferences.theme")} : ${label}`}
        >
          <Icon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("preferences.theme")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={preference}
            onValueChange={(value) => {
              if (isThemePreference(value)) setTheme(value)
            }}
          >
            <DropdownMenuRadioItem value="light">
              <Sun />
              {t("theme.light")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon />
              {t("theme.dark")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Laptop />
              {t("theme.system")}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
