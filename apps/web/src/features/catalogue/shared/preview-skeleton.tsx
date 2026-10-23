import { Skeleton } from "@lyrx/ui/components/skeleton"

import { useLocale } from "@/app/locale-provider"

export function PreviewSkeleton() {
  const { t } = useLocale()
  return (
    <div aria-label={t("common.loadingCatalogue")} className="space-y-5">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-80 w-full rounded-3xl" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
