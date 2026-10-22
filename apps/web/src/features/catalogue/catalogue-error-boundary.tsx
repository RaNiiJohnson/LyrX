import { Link } from "@tanstack/react-router"

import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"

import { PageShell } from "@/app/page-shell"
import { getErrorMessage } from "@/lib/errors"
import { useLocale } from "@/app/locale-provider"

export function CatalogueRouteError({ error }: { error: unknown }) {
  const { t } = useLocale()
  return (
    <PageShell width="wide">
      <Alert variant="destructive">
        <AlertTitle>{t("catalogue.saveError")}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{getErrorMessage(error, t)}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/studio">{t("navigation.studio")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    </PageShell>
  )
}
