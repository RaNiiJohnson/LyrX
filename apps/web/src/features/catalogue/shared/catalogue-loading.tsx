import { Card, CardContent, CardHeader } from "@lyrx/ui/components/card"
import { Skeleton } from "@lyrx/ui/components/skeleton"

import { useLocale } from "@/app/locale-provider"

export function CatalogueEditorSkeleton() {
  const { t } = useLocale()
  return (
    <div aria-label={t("common.loadingCatalogue")} className="space-y-5">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function CatalogueListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1].map((item) => (
        <Card key={item}>
          <CardHeader className="gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
