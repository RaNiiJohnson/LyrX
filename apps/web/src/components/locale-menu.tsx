import { Languages } from "lucide-react"

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

import { useLocale } from "./locale-provider"

export function LocaleMenu() {
  const { locale, setLocale, t } = useLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${t("preferences.language")} : ${
            locale === "fr" ? t("locale.french") : t("locale.english")
          }`}
        >
          <Languages data-icon="inline-start" aria-hidden="true" />
          <span aria-hidden="true">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("preferences.language")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(value) => {
              if (value === "fr" || value === "en") setLocale(value)
            }}
          >
            <DropdownMenuRadioItem value="fr">
              {t("locale.french")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="en">
              {t("locale.english")}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
