import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"

import { getPublicRuntimeConfig } from "@/lib/runtime-config"
import { useLocale } from "./locale-provider"

export function BackendRequired({ children }: { children: React.ReactNode }) {
  const { t } = useLocale()
  if (getPublicRuntimeConfig()) return children

  return (
    <Alert>
      <AlertTitle>{t("backend.requiredTitle")}</AlertTitle>
      <AlertDescription>{t("backend.requiredDescription")}</AlertDescription>
    </Alert>
  )
}
