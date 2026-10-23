import { useLocale } from "@/app/locale-provider"

export function OptionalLabel() {
  const { t } = useLocale()

  return (
    <span className="text-xs font-normal text-muted-foreground">
      {t("common.optional")}
    </span>
  )
}
