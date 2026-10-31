import { Card, CardContent, CardHeader } from "@lyrx/ui/components/card"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { useLocale } from "@/app/locale-provider"

export function AccountLandingSkeleton() {
  const { t } = useLocale()
  return (
    <Card aria-label={t("common.loadingAccount")}>
      <CardHeader className="gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </CardContent>
    </Card>
  )
}
