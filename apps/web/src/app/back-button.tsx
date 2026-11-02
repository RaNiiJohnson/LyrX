import { Link, useCanGoBack, useRouter } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@lyrx/ui/components/button"

import { useLocale } from "./locale-provider"

/**
 * Returns to the previous in-app page (keeping its scroll and filters), or to
 * a sensible list when the page was opened directly from a shared link.
 */
export function BackButton({
  fallback,
}: {
  fallback: "/songs" | "/albums" | "/community" | "/artists"
}) {
  const { t } = useLocale()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  if (canGoBack) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => router.history.back()}
      >
        <ArrowLeft data-icon="inline-start" /> {t("common.back")}
      </Button>
    )
  }
  return (
    <Button asChild variant="ghost" size="sm">
      <Link to={fallback}>
        <ArrowLeft data-icon="inline-start" /> {t("common.back")}
      </Link>
    </Button>
  )
}
